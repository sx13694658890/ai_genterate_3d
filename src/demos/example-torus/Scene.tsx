import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { paths } from "@/resources/paths";
import { clamp } from "@/three/lib/math";
import { createPbrMaterial } from "@/three/materials/createMaterial";
import { disposeMaterial } from "@/three/lib/dispose";

export function ExampleTorusScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { color, tube, spin, metalness, roughness } = useControls("环面体", {
    color: "#c084fc",
    tube: { value: 0.35, min: 0.08, max: 0.55, step: 0.01 },
    spin: { value: 0.45, min: 0, max: 2, step: 0.05 },
    metalness: { value: 0.35, min: 0, max: 1, step: 0.01 },
    roughness: { value: 0.28, min: 0, max: 1, step: 0.01 },
  });

  const safeTube = clamp(tube, 0.08, 0.55);

  const material = useMemo(
    () => createPbrMaterial({ color, metalness, roughness }),
    [color, metalness, roughness]
  );

  useEffect(() => {
    return () => disposeMaterial(material);
  }, [material]);

  useFrame((_, delta) => {
    const m = meshRef.current;
    if (!m) return;
    m.rotation.z += delta * spin;
  });

  return (
    <>
      <hemisphereLight args={["#5c5c70", "#18181f", 0.5]} />
      <ambientLight intensity={0.42} />
      <spotLight position={[3, 5, 2]} intensity={1.25} angle={0.4} penumbra={0.5} />
      <directionalLight position={[-2, 3, -1]} intensity={0.4} />
      <group userData={{ assetsBase: paths.base }}>
        <mesh ref={meshRef} material={material}>
          <torusGeometry args={[1, safeTube, 48, 96]} />
        </mesh>
      </group>
      <OrbitControls makeDefault enableDamping dampingFactor={0.06} />
    </>
  );
}
