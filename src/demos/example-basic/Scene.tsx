import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createPbrMaterial } from "@/three/materials/createMaterial";
import { disposeMaterial } from "@/three/lib/dispose";

export function ExampleBasicScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { color, speed, metalness, roughness } = useControls("基础立方体", {
    color: "#38bdf8",
    speed: { value: 0.6, min: 0, max: 3, step: 0.05 },
    metalness: { value: 0.15, min: 0, max: 1, step: 0.01 },
    roughness: { value: 0.42, min: 0, max: 1, step: 0.01 },
  });

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
    m.rotation.y += delta * speed;
    m.rotation.x += delta * speed * 0.35;
  });

  return (
    <>
      <hemisphereLight args={["#606078", "#1a1a22", 0.55]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 3]} intensity={1.15} />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
      <mesh ref={meshRef} material={material}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </>
  );
}
