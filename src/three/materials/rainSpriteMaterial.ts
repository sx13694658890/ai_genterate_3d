import * as THREE from "three";

export type RainSpriteMaterialOptions = {
  opacity?: number;
  /** 雪花等黑底贴图可用 AdditiveBlending，黑区不叠色 */
  blending?: THREE.Blending;
  depthWrite?: boolean;
};

/**
 * 文档 7.1：大量 Sprite 共用同一材质与贴图。
 */
export function createRainSpriteMaterial(
  map: THREE.Texture,
  options: RainSpriteMaterialOptions = {}
): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map,
    transparent: true,
    opacity: options.opacity ?? 0.6,
    depthWrite: options.depthWrite ?? false,
    blending: options.blending ?? THREE.NormalBlending,
  });
}
