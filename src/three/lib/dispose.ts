import * as THREE from "three";

function disposeStandardMaterialMaps(m: THREE.MeshStandardMaterial): void {
  const maps: (THREE.Texture | null | undefined)[] = [
    m.map,
    m.normalMap,
    m.roughnessMap,
    m.metalnessMap,
    m.aoMap,
    m.emissiveMap,
    m.alphaMap,
    m.bumpMap,
    m.displacementMap,
    m.envMap,
    m.lightMap,
  ];
  for (const t of maps) t?.dispose();
}

/** 释放材质及其常见贴图引用 */
export function disposeMaterial(material: THREE.Material): void {
  if (material instanceof THREE.MeshStandardMaterial) {
    disposeStandardMaterialMaps(material);
  }
  material.dispose();
}

/** 递归释放 Object3D 下的几何体与材质 */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const m = mesh.material;
      if (Array.isArray(m)) m.forEach(disposeMaterial);
      else if (m) disposeMaterial(m);
    }
  });
}
