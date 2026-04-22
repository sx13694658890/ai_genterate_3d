import mainGlsl from "./main.glsl?raw";
import senlinGlsl from "./senlin.glsl?raw";

/** 避免与片元阶段 `out vec4 fragColor` 同名导致部分驱动链接失败 */
function preprocessMainGlsl(src: string): string {
  let s = src.replace(
    /void mainImage\( out vec4 fragColor, in vec2 fragCoord \)/,
    "void mainImage( out vec4 shadertoyOut, in vec2 fragCoord )"
  );
  s = s.replace(
    /fragColor = vec4\( ca\[ip\.x\], -dot\(ca\[ip\.x\],ro\) \);/,
    "shadertoyOut = vec4( ca[ip.x], -dot(ca[ip.x],ro) );"
  );
  s = s.replace(/fragColor = vec4\( col, 1\.0 \);/, "shadertoyOut = vec4( col, 1.0 );");
  return s;
}

function preprocessSenlinGlsl(src: string): string {
  let s = src.replace(
    /void mainImage\( out vec4 fragColor, in vec2 fragCoord \)/,
    "void mainImage( out vec4 shadertoyOut, in vec2 fragCoord )"
  );
  s = s.replace(/fragColor = vec4\( col, 1\.0 \);/, "shadertoyOut = vec4( col, 1.0 );");
  return s;
}

const mainBody = preprocessMainGlsl(mainGlsl);
const senlinBody = preprocessSenlinGlsl(senlinGlsl);

/**
 * Inigo Quilez 雨林地形 raymarch（main.glsl）：含上一帧 iChannel0 反投影累积。
 * WebGL2 GLSL3：texelFetch / textureLod；须 RawShaderMaterial + glslVersion: GLSL3。
 */
export function buildSenlinMainFragmentShader(): string {
  return `precision highp float;
precision highp int;

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform int iFrame;

out vec4 fragColor;

${mainBody}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}

/** 第二遍：边缘压暗（senlin.glsl 原 Image pass） */
export function buildSenlinPostFragmentShader(): string {
  return `precision highp float;

uniform vec2 iResolution;
uniform sampler2D iChannel0;

out vec4 fragColor;

${senlinBody}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}

export const senlinVertexShader = `precision highp float;

in vec3 position;

void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
