import * as THREE from "three";

/** 程序化「窗外」RGB 纹理，需 mipmap 供 rain.glsl 中 textureLod 采样。 */
export function createRainWindowBackgroundTexture(seed = 0x9e3779b9): THREE.DataTexture {
  const w = 1024;
  const h = 1024;
  const data = new Uint8Array(w * h * 4);

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const u = i / w;
      const v = j / h;
      let r = 0.12 + 0.22 * v;
      let g = 0.18 + 0.32 * v;
      let b = 0.42 + 0.18 * (1 - v);
      r += 0.06 * Math.sin(u * 9 + seed * 1e-6);
      g += 0.05 * Math.cos(v * 11 + seed * 2e-6);

      const bx = Math.sin(seed * 0.0007) * 0.35 + 0.5;
      const by = Math.cos(seed * 0.0011) * 0.35 + 0.5;
      const d = Math.hypot(u - bx, v - by);
      const bloom = Math.exp(-d * 6) * 0.55;
      r += bloom * 0.45;
      g += bloom * 0.28;
      b += bloom * 0.12;

      const idx = (j * w + i) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.round(r * 255)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
