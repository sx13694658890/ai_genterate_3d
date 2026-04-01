import * as THREE from "three";

/**
 * 「房间」演示用材质预设（风格参考 Bruno Simon / my-room-in-3d，非资源拷贝）。
 */
export function createRoomFloorWood(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#c9a882",
    roughness: 0.82,
    metalness: 0.04,
  });
}

export function createRoomWallCream(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#f2ebe3",
    roughness: 0.92,
    metalness: 0,
  });
}

export function createRoomWallAccent(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#d86f5c",
    roughness: 0.88,
    metalness: 0,
  });
}

export function createRoomDeskWood(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#5c4032",
    roughness: 0.62,
    metalness: 0.08,
  });
}

export function createRoomPlasticDark(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#2a2a30",
    roughness: 0.55,
    metalness: 0.35,
  });
}

export function createRoomScreenGlow(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#0f1419",
    emissive: "#7eb8ff",
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.25,
  });
}

export function createRoomScreenGlowAlt(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#0f1419",
    emissive: "#98e4c0",
    emissiveIntensity: 0.45,
    roughness: 0.4,
    metalness: 0.2,
  });
}

export function createRoomRug(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#4a6fa5",
    roughness: 0.95,
    metalness: 0,
  });
}

export function createRoomLampShade(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#faf6ef",
    emissive: "#ffd9a8",
    emissiveIntensity: 0.35,
    roughness: 0.65,
    metalness: 0,
  });
}

export function createRoomBook(spine: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: spine,
    roughness: 0.78,
    metalness: 0,
  });
}
