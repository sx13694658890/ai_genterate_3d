import type { PbrMaterialParams } from "../types";

export const pbrStandardPreset: Pick<
  PbrMaterialParams,
  "metalness" | "roughness" | "envMapIntensity"
> = {
  metalness: 0.15,
  roughness: 0.42,
  envMapIntensity: 1,
};
