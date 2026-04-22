import fragImgGlsl from "./frag_img.glsl?raw";
import shaderAGlsl from "./shader_a.glsl?raw";
import shaderBGlsl from "./shader_b.glsl?raw";
import shaderCGlsl from "./shader_c.glsl?raw";
import shaderDGlsl from "./shader_d.glsl?raw";

/** Buffer A 射线步进/热浪等强度：high 为原版；medium/low 缩短主循环与附属循环（类 raymarch 限步、远距剔除思路）。 */
export type UniverseRaymarchQuality = "high" | "medium" | "low";

/**
 * 在 shader_a 上做受控降级，避免改 3000+ 行主体逻辑。
 * - low：关热浪折射大块、压低 MaxStep / 吸积盘子步进 / 雨栅格迭代
 * - medium：保留热浪但减少探测步与步进上限
 */
function patchShaderAForQuality(src: string, quality: UniverseRaymarchQuality): string {
  if (quality === "high") return src;
  let s = src;

  if (quality === "low") {
    s = s.replace(/#define ENABLE_HEAT_HAZE\s+1\b/, "#define ENABLE_HEAT_HAZE        0");
    s = s.replace(
      /float MaxStep=150\.0\+300\.0\/\(1\.0\+1000\.0\*\(1\.0-iSpin\*iSpin-iQ\*iQ\)\*\(1\.0-iSpin\*iSpin-iQ\*iQ\)\);/,
      "float MaxStep=52.0+68.0/(1.0+1000.0*(1.0-iSpin*iSpin-iQ*iQ)*(1.0-iSpin*iSpin-iQ*iQ));"
    );
    s = s.replace(/if\(bIsNakedSingularity\) MaxStep=450\.0;/, "if(bIsNakedSingularity) MaxStep=105.0;");
    s = s.replace(/const int ITERATIONS = 40;/, "const int ITERATIONS = 16;");
    s = s.replace(/int MaxSubSteps = 32;/, "int MaxSubSteps = 12;");
    s = s.replace(/#define HAZE_PROBE_STEPS\s+10\b/, "#define HAZE_PROBE_STEPS        4");
    return s;
  }

  /* medium */
  s = s.replace(
    /float MaxStep=150\.0\+300\.0\/\(1\.0\+1000\.0\*\(1\.0-iSpin\*iSpin-iQ\*iQ\)\*\(1\.0-iSpin\*iSpin-iQ\*iQ\)\);/,
    "float MaxStep=95.0+195.0/(1.0+1000.0*(1.0-iSpin*iSpin-iQ*iQ)*(1.0-iSpin*iSpin-iQ*iQ));"
  );
  s = s.replace(/if\(bIsNakedSingularity\) MaxStep=450\.0;/, "if(bIsNakedSingularity) MaxStep=270.0;");
  s = s.replace(/const int ITERATIONS = 40;/, "const int ITERATIONS = 28;");
  s = s.replace(/int MaxSubSteps = 32;/, "int MaxSubSteps = 22;");
  s = s.replace(/#define HAZE_PROBE_STEPS\s+10\b/, "#define HAZE_PROBE_STEPS        6");
  return s;
}

function preprocessShaderA(src: string): string {
  let s = src.replace(
    /int\s+iBufWidth\s+=\s+int\(iChannelResolution\[2\]\.x\);/,
    "int  iBufWidth     = int(iChannelResolution2.x);"
  );
  s = s.replace(
    /void mainImage\( out vec4 FragColor, in vec2 FragCoord \)/,
    "void mainImage( out vec4 shadertoyOut, in vec2 FragCoord )"
  );
  s = s.replace(/FragColor = /, "shadertoyOut = ");
  return s;
}

function preprocessShaderB(src: string): string {
  let s = src.replace(
    /void UpdateCameraState\(out vec4 fragColor, in vec2 fragCoord\)/,
    "void UpdateCameraState(out vec4 outPixel, in vec2 fragCoord)"
  );
  s = s.replace(/void mainImage\( out vec4 fragColor, in vec2 fragCoord \)/i, "void mainImage( out vec4 shadertoyOut, in vec2 fragCoord )");
  s = s.replace(/UpdateCameraState\(fragColor, fragCoord\)/, "UpdateCameraState(shadertoyOut, fragCoord)");
  s = s.replace(/fragColor = vec4\(color, 1\.0\);/, "shadertoyOut = vec4(color, 1.0);");
  s = s.replace(/fragColor =/g, "outPixel =");
  return s;
}

function preprocessMainImageFragColor(src: string): string {
  let s = src.replace(
    /void mainImage\( out vec4 fragColor, in vec2 fragCoord \)/i,
    "void mainImage( out vec4 shadertoyOut, in vec2 fragCoord )"
  );
  s = s.replace(/fragColor = vec4\(color, 1\.0\);/, "shadertoyOut = vec4(color, 1.0);");
  s = s.replace(/fragColor = vec4\(color,1\.0\);/, "shadertoyOut = vec4(color,1.0);");
  return s;
}

function preprocessFragImg(src: string): string {
  let s = src.replace(
    /void mainImage\( out vec4 fragColor, in vec2 fragCoord \)/i,
    "void mainImage( out vec4 shadertoyOut, in vec2 fragCoord )"
  );
  s = s.replace(/fragColor = vec4\(color, 1\.0\);/, "shadertoyOut = vec4(color, 1.0);");
  return s;
}

function buildBodyA(quality: UniverseRaymarchQuality): string {
  return preprocessShaderA(patchShaderAForQuality(shaderAGlsl, quality));
}

const bodyB = preprocessShaderB(shaderBGlsl);
const bodyC = preprocessMainImageFragColor(shaderCGlsl);
const bodyD = preprocessMainImageFragColor(shaderDGlsl);
const bodyImg = preprocessFragImg(fragImgGlsl);

export const universeVertexShader = `precision highp float;

in vec3 position;

void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Buffer A：克尔-纽曼黑洞主渲染 + TAA 历史（iChannel3） */
export function buildUniverseBufferAFragmentShader(quality: UniverseRaymarchQuality = "medium"): string {
  const bodyA = buildBodyA(quality);
  return `precision highp float;
precision highp int;

uniform float iTime;
uniform vec2 iResolution;
uniform int iFrame;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform vec3 iChannelResolution2;

out vec4 fragColor;

${bodyA}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}

/** Buffer B：底行相机状态 + 左侧 bloom 金字塔 */
export function buildUniverseBufferBFragmentShader(): string {
  return `precision highp float;
precision highp int;

uniform float iTime;
uniform float iTimeDelta;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform int iFrame;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel3;

out vec4 fragColor;

${bodyB}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}

/** Buffer C：水平高斯模糊 */
export function buildUniverseBufferCFragmentShader(): string {
  return `precision highp float;

uniform vec2 iResolution;
uniform sampler2D iChannel0;

out vec4 fragColor;

${bodyC}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}

/** Buffer D：垂直高斯模糊 */
export function buildUniverseBufferDFragmentShader(): string {
  return `precision highp float;

uniform vec2 iResolution;
uniform sampler2D iChannel0;

out vec4 fragColor;

${bodyD}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}

/** Image：场景 + bloom 合成与 tonemap */
export function buildUniverseImageFragmentShader(): string {
  return `precision highp float;

uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel3;

out vec4 fragColor;

${bodyImg}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}
