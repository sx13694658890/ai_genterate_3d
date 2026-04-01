/** 资源在清单中的逻辑标识，避免与文件路径混用 */
export type AssetId = string;

export type TextureAssetKind = "texture";
export type ModelAssetKind = "model";
export type EnvAssetKind = "env";

export type AssetKind = TextureAssetKind | ModelAssetKind | EnvAssetKind;

export type AssetEntry = {
  id: AssetId;
  kind: AssetKind;
  /** 相对 `public/assets/` 的路径片段，如 `textures/foo.jpg` */
  path: string;
  preload?: boolean;
};
