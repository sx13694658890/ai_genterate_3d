import type { ComponentProps } from "react";
import { useRef } from "react";
import * as THREE from "three";
import { useAnimations, useGLTF } from "@react-three/drei";
import { paths } from "@/resources/paths";

const cityModelUrl = paths.models("city.glb");

/**
 * 城市模型由 GLB 直接挂载，避免 gltfjsx 展开成数万行 JSX（会触发 Babel >500KB 反优化警告）。
 */
export function Model(props: ComponentProps<"group">) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(cityModelUrl);
  useAnimations(animations, group);

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

useGLTF.preload(cityModelUrl);
