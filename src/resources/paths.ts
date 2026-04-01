/**
 * 统一资源 URL，禁止在 demos 中手写 `/assets/...` 字符串。
 * 文件实体放在 `public/assets/**`。
 */
const base = `${import.meta.env.BASE_URL}assets`;

export const paths = {
  base,
  textures: (file: string) => `${base}/textures/${file}`,
  models: (file: string) => `${base}/models/${file}`,
  env: (file: string) => `${base}/env/${file}`,
  audio: (file: string) => `${base}/audio/${file}`,
  fonts: (file: string) => `${base}/fonts/${file}`,
} as const;
