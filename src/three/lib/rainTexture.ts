import * as THREE from "three";

/**
 * 程序化雨滴精灵贴图（竖条渐变），避免依赖外部 raindrop.png。
 * 对应文档「纹理贴图精灵」思路，雨雪共用 Sprite 体系时可复用类似工厂。
 */
export function createRainSpriteTexture(): THREE.CanvasTexture {
  const w = 16;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }
  ctx.clearRect(0, 0, w, h);
  const grd = ctx.createLinearGradient(w / 2, 0, w / 2, h);
  grd.addColorStop(0, "rgba(200, 230, 255, 0)");
  grd.addColorStop(0.12, "rgba(220, 240, 255, 0.25)");
  grd.addColorStop(0.5, "rgba(240, 248, 255, 0.92)");
  grd.addColorStop(0.88, "rgba(220, 240, 255, 0.25)");
  grd.addColorStop(1, "rgba(200, 230, 255, 0)");
  ctx.fillStyle = grd;
  ctx.fillRect(2, 0, w - 4, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
