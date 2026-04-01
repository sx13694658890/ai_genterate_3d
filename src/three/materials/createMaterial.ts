import * as THREE from "three";
import { pbrStandardPreset } from "./presets/pbrStandard";
import type { PbrMaterialParams } from "./types";

export function createPbrMaterial(params: PbrMaterialParams): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: params.color,
    metalness: params.metalness ?? pbrStandardPreset.metalness,
    roughness: params.roughness ?? pbrStandardPreset.roughness,
    envMapIntensity: params.envMapIntensity ?? pbrStandardPreset.envMapIntensity,
  });
}

export type { PbrMaterialParams } from "./types";
