import type { AssetEntry } from "./types";

/** 按 id 登记资源，供预加载或文档生成使用 */
export const assetManifest: AssetEntry[] = [
  // 示例：有贴图后取消注释并填入真实文件名
  // { id: "hero-albedo", kind: "texture", path: "textures/hero-albedo.jpg", preload: false },
];

export function getAssetById(id: string): AssetEntry | undefined {
  return assetManifest.find((a) => a.id === id);
}
