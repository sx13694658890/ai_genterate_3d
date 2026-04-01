import * as THREE from "three";

const textureCache = new Map<string, THREE.Texture>();

/**
 * 按 URL 缓存的贴图加载（非 Hook 场景）。
 * 在 R3F 中优先使用 `useLoader(TextureLoader, url)`；此函数供材质工厂或工具脚本复用。
 */
export function loadTextureCached(
  url: string,
  loader: THREE.TextureLoader = new THREE.TextureLoader()
): Promise<THREE.Texture> {
  const hit = textureCache.get(url);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

export function evictTextureCache(url: string): void {
  const tex = textureCache.get(url);
  if (tex) {
    tex.dispose();
    textureCache.delete(url);
  }
}
