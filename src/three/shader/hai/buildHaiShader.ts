import haiGlsl from "./hai.glsl?raw";

/**
 * 将 Shadertoy 片段（mainImage + texture()）接到 WebGL1 GLSL ES 全屏四边形上。
 * texture() → texture2D() 以兼容 three.js 默认 ShaderMaterial 方言。
 */
export function buildHaiFragmentShader(): string {
  const body = haiGlsl.replace(/\btexture\s*\(/g, "texture2D(");
  return `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

${body}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec4 fragColor;
  mainImage(fragColor, fragCoord);
  gl_FragColor = fragColor;
}
`;
}

export const haiVertexShader = `
precision highp float;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
