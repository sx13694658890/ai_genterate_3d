import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { disposeMaterial } from "@/three/lib/dispose";

function createGradientBoxGeometry(size = 1): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(size, size, size).toNonIndexed();
  const pos = geometry.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);

  const bottom = new THREE.Color("#12304a");
  const mid = new THREE.Color("#2f7ac6");
  const top = new THREE.Color("#a7f3ff");

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const yN = (y + size * 0.5) / size;
    const color = new THREE.Color();

    if (yN < 0.55) color.lerpColors(bottom, mid, yN / 0.55);
    else color.lerpColors(mid, top, (yN - 0.55) / 0.45);

    // 让边角有轻微冷暖变化，避免纯线性渐变过于平
    const pulse = 0.08 * (Math.sin((x + z) * 8) * 0.5 + 0.5);
    color.offsetHSL(0.01 * x, 0, pulse);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function ExampleBasicScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.LineSegments>(null);
  const { speed, edgeOpacity, edgeGlow } = useControls("基础立方体", {
    speed: { value: 0.55, min: 0, max: 3, step: 0.05 },
    edgeOpacity: { value: 0.9, min: 0.2, max: 1, step: 0.02 },
    edgeGlow: { value: 1.2, min: 0.4, max: 2.4, step: 0.05 },
  });

  const geometry = useMemo(() => createGradientBoxGeometry(1), []);
  const boxMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.84,
        metalness: 0.22,
        roughness: 0.32,
      }),
    []
  );
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 28), [geometry]);
  const edgeMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#8ff4ff",
        transparent: true,
        opacity: edgeOpacity,
      }),
    [edgeOpacity]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      edgeGeometry.dispose();
      disposeMaterial(boxMaterial);
      disposeMaterial(edgeMaterial);
    };
  }, [geometry, edgeGeometry, boxMaterial, edgeMaterial]);

  useFrame((state, delta) => {
    const m = meshRef.current;
    const e = edgeRef.current;
    if (!m || !e) return;

    m.rotation.y += delta * speed;
    m.rotation.x += delta * speed * 0.32;
    e.rotation.copy(m.rotation);

    const t = state.clock.elapsedTime;
    const pulse = 0.72 + Math.sin(t * 2.1) * 0.28;
    (e.material as THREE.LineBasicMaterial).opacity = edgeOpacity * pulse;
    m.scale.setScalar(1 + Math.sin(t * 1.1) * 0.015 * edgeGlow);
  });

  return (
    <>
      <hemisphereLight args={["#5f6a8a", "#101320", 0.56]} />
      <ambientLight intensity={0.26} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} color="#d9e7ff" />
      <directionalLight position={[-3, 2, -2]} intensity={0.42} color="#7be8ff" />
      <mesh ref={meshRef} geometry={geometry} material={boxMaterial} />
      <lineSegments ref={edgeRef} geometry={edgeGeometry} material={edgeMaterial} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </>
  );
}
