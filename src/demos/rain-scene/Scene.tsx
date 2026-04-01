import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createRainSpriteTexture } from "@/three/lib/rainTexture";
import { createRainSpriteMaterial } from "@/three/materials/rainSpriteMaterial";
import { createPbrMaterial } from "@/three/materials/createMaterial";
import { disposeMaterial } from "@/three/lib/dispose";

type RainBuildConfig = {
  count: number;
  rangeX: number;
  rangeY: number;
  rangeZ: number;
};

/** 文档 5.1：批量 Sprite + 共享材质，scale 竖向拉长模拟雨滴。 */
function buildRainGroup(cfg: RainBuildConfig, material: THREE.SpriteMaterial): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < cfg.count; i++) {
    const drop = new THREE.Sprite(material);
    drop.position.set(
      (Math.random() - 0.5) * cfg.rangeX,
      Math.random() * cfg.rangeY,
      (Math.random() - 0.5) * cfg.rangeZ
    );
    const s = 0.035 + Math.random() * 0.055;
    drop.scale.set(s, s * 2.2, 1);
    group.add(drop);
  }
  return group;
}

export function RainScene() {
  const { count, fallSpeed, rangeX, rangeY, rangeZ, windX, opacity, fogNear, fogFar } =
    useControls("下雨 (Sprite)", {
      count: { value: 4800, min: 800, max: 10000, step: 100 },
      fallSpeed: { value: 11, min: 3, max: 35, step: 0.5 },
      rangeX: { value: 26, min: 12, max: 48, step: 1 },
      rangeY: { value: 20, min: 10, max: 36, step: 1 },
      rangeZ: { value: 26, min: 12, max: 48, step: 1 },
      windX: { value: 0.6, min: -4, max: 4, step: 0.1 },
      opacity: { value: 0.52, min: 0.15, max: 1, step: 0.02 },
      fogNear: { value: 10, min: 4, max: 30 },
      fogFar: { value: 52, min: 20, max: 90 },
    });

  const texture = useMemo(() => createRainSpriteTexture(), []);
  const material = useMemo(
    () => createRainSpriteMaterial(texture, { opacity: 0.52 }),
    [texture]
  );

  const rainGroup = useMemo(
    () => buildRainGroup({ count, rangeX, rangeY, rangeZ }, material),
    [count, rangeX, rangeY, rangeZ, material]
  );

  const rainRef = useRef(rainGroup);
  rainRef.current = rainGroup;

  const simRef = useRef({ fallSpeed, windX, rangeX, rangeY, rangeZ });
  simRef.current = { fallSpeed, windX, rangeX, rangeY, rangeZ };

  useEffect(() => {
    material.opacity = opacity;
    material.needsUpdate = true;
  }, [opacity, material]);

  useFrame((_, dt) => {
    const g = rainRef.current;
    const { fallSpeed: spd, windX: wx, rangeX: rx, rangeY: ry, rangeZ: rz } =
      simRef.current;
    for (const child of g.children) {
      const s = child as THREE.Sprite;
      s.position.y -= spd * dt;
      s.position.x += wx * dt;
      if (s.position.y < 0) {
        s.position.y = ry;
        s.position.x = (Math.random() - 0.5) * rx;
        s.position.z = (Math.random() - 0.5) * rz;
      }
    }
  });

  useEffect(() => {
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

  const groundMat = useMemo(
    () => createPbrMaterial({ color: "#1a2332", metalness: 0.12, roughness: 0.88 }),
    []
  );
  useEffect(() => {
    return () => disposeMaterial(groundMat);
  }, [groundMat]);

  const { camera, scene } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0, 8.5, 24);
    camera.near = 0.4;
    camera.far = 100;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 3.5, 0);
  }, [camera]);

  useEffect(() => {
    const fog = new THREE.Fog("#0b1220", fogNear, fogFar);
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fogNear, fogFar]);

  return (
    <>
      <color attach="background" args={["#0b1220"]} />
      <ambientLight intensity={0.38} />
      <directionalLight position={[8, 22, 6]} intensity={0.9} />
      <directionalLight position={[-6, 10, -4]} intensity={0.22} color="#a8c4ff" />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} material={groundMat}>
        <planeGeometry args={[96, 96]} />
      </mesh>
      <primitive object={rainGroup} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.055}
        target={[0, 3.5, 0]}
        maxPolarAngle={Math.PI * 0.49}
      />
    </>
  );
}
