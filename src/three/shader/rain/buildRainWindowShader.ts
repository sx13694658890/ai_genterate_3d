import rainGlsl from "./rain.glsl?raw";

/**
 * 去掉 HAS_HEART，保留「可调雨量 + 玻璃雾/水痕 + textureLod 景深」的窗户雨效果。
 * 可选：用 uUseManualRain / uManualRain 覆盖原 shader 的雨量逻辑。
 */
function preprocessRainGlsl(src: string): string {
  let s = src.replace(/^\s*#define\s+HAS_HEART\s*$/m, "");
  s = s.replace(
    /float rainAmount = iMouse\.z>0\. \? M\.y : sin\(T\*\.05\)\*\.3+\.7;/,
    "float rainAmount = uUseManualRain>0 ? uManualRain : (iMouse.z>0. ? M.y : sin(T*.05)*.3+.7);"
  );
  // 避免与全局 `out vec4 fragColor` 同名导致部分驱动链接失败
  s = s.replace(
    /void mainImage\( out vec4 fragColor, in vec2 fragCoord \)/,
    "void mainImage( out vec4 shadertoyOut, in vec2 fragCoord )"
  );
  s = s.replace(/fragColor = vec4\(col, 1\.\);/, "shadertoyOut = vec4(col, 1.);");
  return s;
}

const rainBody = preprocessRainGlsl(rainGlsl);

/**
 * WebGL2 GLSL3：`textureLod` 与 `iChannel0` 的 mipmap 配合做雨滴折射模糊。
 * 使用处请配 THREE.RawShaderMaterial + glslVersion: GLSL3；源码中不要写 #version（three 会自动前置）。
 */
export function buildRainWindowFragmentShader(): string {
  // 勿写 #version：RawShaderMaterial + glslVersion: GLSL3 时 three 会前置 `#version 300 es`
  return `precision highp float;
precision highp int;

uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform int uUseManualRain;
uniform float uManualRain;

out vec4 fragColor;

${rainBody}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`;
}

export const rainWindowVertexShader = `precision highp float;

in vec3 position;

void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
