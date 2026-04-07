import * as THREE from "three";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 与 Shadertoy 中 iChannel 噪声贴图类似的灰度 DataTexture，可重复采样。 */
export function createHaiNoiseTexture(seed: number): THREE.DataTexture {
  const w = 256;
  const h = 256;
  const data = new Uint8Array(w * h * 4);
  const rnd = mulberry32(seed);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(rnd() * 256);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
