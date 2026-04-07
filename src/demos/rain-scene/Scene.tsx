import { OrbitControls, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createRainSpriteTexture } from "@/three/lib/rainTexture";
import { createRainSpriteMaterial } from "@/three/materials/rainSpriteMaterial";
import { createPbrMaterial } from "@/three/materials/createMaterial";
import { disposeMaterial } from "@/three/lib/dispose";

const SNOW_TEX_URL = "/assets/textures/snow.png";

type RainBuildConfig = {
  count: number;
  rangeX: number;
  rangeY: number;
  rangeZ: number;
  /** 再生高度在 [rangeY, rangeY+spawnBand]，避免全部落在同一水平面 */
  spawnBand: number;
};

type RainDropUserData = {
  fallMul: number;
  windMul: number;
  zPhase: number;
  zSwirl: number;
};

/** 文档 5.1：批量 Sprite + 共享材质，scale 竖向拉长模拟雨滴。 */
function buildRainGroup(cfg: RainBuildConfig, material: THREE.SpriteMaterial): THREE.Group {
  const group = new THREE.Group();
  const yTop = cfg.rangeY + cfg.spawnBand;
  for (let i = 0; i < cfg.count; i++) {
    const drop = new THREE.Sprite(material);
    drop.position.set(
      (Math.random() - 0.5) * cfg.rangeX,
      Math.random() * yTop,
      (Math.random() - 0.5) * cfg.rangeZ
    );
    const u = drop.userData as RainDropUserData;
    u.fallMul = 0.72 + Math.random() * 0.56;
    u.windMul = 0.82 + Math.random() * 0.36;
    u.zPhase = Math.random() * Math.PI * 2;
    u.zSwirl = 0.35 + Math.random() * 1.15;
    const s = 0.035 + Math.random() * 0.055;
    drop.scale.set(s, s * (2.05 + Math.random() * 0.45), 1);
    group.add(drop);
  }
  return group;
}

type SnowflakeUserData = {
  phase: number;
  spin: number;
  wobbleX: number;
  wobbleZ: number;
  fallMul: number;
};

/** 雪花：近正方形 scale + 随机相位，便于飘动与自旋。 */
function buildSnowGroup(cfg: RainBuildConfig, material: THREE.SpriteMaterial): THREE.Group {
  const group = new THREE.Group();
  const yTop = cfg.rangeY + cfg.spawnBand;
  for (let i = 0; i < cfg.count; i++) {
    const flake = new THREE.Sprite(material);
    flake.position.set(
      (Math.random() - 0.5) * cfg.rangeX,
      Math.random() * yTop,
      (Math.random() - 0.5) * cfg.rangeZ
    );
    const u = flake.userData as SnowflakeUserData;
    u.phase = Math.random() * Math.PI * 2;
    u.spin = (Math.random() - 0.5) * 2.4;
    u.wobbleX = 0.6 + Math.random() * 1.4;
    u.wobbleZ = 0.6 + Math.random() * 1.4;
    u.fallMul = 0.78 + Math.random() * 0.44;
    const s = 0.06 + Math.random() * 0.11;
    flake.scale.set(s, s, 1);
    flake.rotation.z = Math.random() * Math.PI * 2;
    group.add(flake);
  }
  return group;
}

export function RainScene() {
  const snowTexture = useTexture(SNOW_TEX_URL);
  useEffect(() => {
    snowTexture.colorSpace = THREE.SRGBColorSpace;
    snowTexture.wrapS = THREE.ClampToEdgeWrapping;
    snowTexture.wrapT = THREE.ClampToEdgeWrapping;
    snowTexture.minFilter = THREE.LinearFilter;
    snowTexture.magFilter = THREE.LinearFilter;
    snowTexture.needsUpdate = true;
  }, [snowTexture]);

  const {
    count,
    fallSpeed,
    rangeX,
    rangeY,
    rangeZ,
    windX,
    spawnBand,
    zTurbulence,
    opacity,
    fogNear,
    fogFar,
    snowCount,
    snowFallSpeed,
    snowOpacity,
    snowWobble,
    snowWindFactor,
  } = useControls("下雨 (Sprite)", {
    count: { value: 4800, min: 800, max: 10000, step: 100 },
    fallSpeed: { value: 11, min: 3, max: 35, step: 0.5 },
    rangeX: { value: 26, min: 12, max: 48, step: 1 },
    rangeY: { value: 20, min: 10, max: 36, step: 1 },
    rangeZ: { value: 32, min: 12, max: 56, step: 1 },
    windX: { value: 0.6, min: -4, max: 4, step: 0.1 },
    spawnBand: {
      label: "云层厚度",
      value: 6,
      min: 0,
      max: 18,
      step: 0.5,
    },
    zTurbulence: {
      label: "Z 向湍流",
      value: 0.55,
      min: 0,
      max: 2,
      step: 0.05,
    },
    opacity: { value: 0.52, min: 0.15, max: 1, step: 0.02 },
    fogNear: { value: 10, min: 4, max: 30 },
    fogFar: { value: 52, min: 20, max: 90 },
    snowCount: { label: "雪花数量", value: 720, min: 0, max: 4000, step: 40 },
    snowFallSpeed: { label: "雪花下落", value: 4.2, min: 1, max: 14, step: 0.2 },
    snowOpacity: { label: "雪花透明度", value: 0.38, min: 0.05, max: 0.85, step: 0.02 },
    snowWobble: { label: "雪花飘动", value: 1.15, min: 0, max: 3, step: 0.05 },
    snowWindFactor: { label: "雪花随风", value: 0.45, min: 0, max: 1.2, step: 0.05 },
  });

  const texture = useMemo(() => createRainSpriteTexture(), []);
  const material = useMemo(
    () => createRainSpriteMaterial(texture, { opacity: 0.52 }),
    [texture]
  );

  const snowMaterial = useMemo(
    () =>
      createRainSpriteMaterial(snowTexture, {
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
      }),
    [snowTexture]
  );

  const rainGroup = useMemo(
    () => buildRainGroup({ count, rangeX, rangeY, rangeZ, spawnBand }, material),
    [count, rangeX, rangeY, rangeZ, spawnBand, material]
  );

  const snowGroup = useMemo(() => {
    if (snowCount <= 0) return new THREE.Group();
    return buildSnowGroup({ count: snowCount, rangeX, rangeY, rangeZ, spawnBand }, snowMaterial);
  }, [snowCount, rangeX, rangeY, rangeZ, spawnBand, snowMaterial]);

  const rainRef = useRef(rainGroup);
  rainRef.current = rainGroup;
  const snowRef = useRef(snowGroup);
  snowRef.current = snowGroup;

  const simRef = useRef({
    fallSpeed,
    windX,
    rangeX,
    rangeY,
    rangeZ,
    spawnBand,
    zTurbulence,
  });
  simRef.current = { fallSpeed, windX, rangeX, rangeY, rangeZ, spawnBand, zTurbulence };

  const snowSimRef = useRef({
    snowFallSpeed,
    snowWobble,
    snowWindFactor,
    windX,
    rangeX,
    rangeY,
    rangeZ,
    spawnBand,
  });
  snowSimRef.current = {
    snowFallSpeed,
    snowWobble,
    snowWindFactor,
    windX,
    rangeX,
    rangeY,
    rangeZ,
    spawnBand,
  };

  useEffect(() => {
    material.opacity = opacity;
    material.needsUpdate = true;
  }, [opacity, material]);

  useEffect(() => {
    snowMaterial.opacity = snowOpacity;
    snowMaterial.needsUpdate = true;
  }, [snowOpacity, snowMaterial]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const g = rainRef.current;
    const {
      fallSpeed: spd,
      windX: wx,
      rangeX: rx,
      rangeY: ry,
      rangeZ: rz,
      spawnBand: band,
      zTurbulence: zTur,
    } = simRef.current;
    for (const child of g.children) {
      const s = child as THREE.Sprite;
      const u = s.userData as RainDropUserData;
      s.position.y -= spd * u.fallMul * dt;
      s.position.x += wx * u.windMul * dt;
      const zWave = Math.sin(t * u.zSwirl * 2.05 + u.zPhase) * zTur;
      s.position.z += (zWave + wx * 0.22 * u.windMul) * dt;
      if (s.position.y < 0) {
        s.position.y = ry + Math.random() * band;
        s.position.x = (Math.random() - 0.5) * rx;
        s.position.z = (Math.random() - 0.5) * rz;
      }
    }

    const sg = snowRef.current;
    const snowCfg = snowSimRef.current;
    if (sg.children.length === 0) return;
    const {
      snowFallSpeed: sfs,
      snowWobble: wob,
      snowWindFactor: swf,
      windX: swx,
      rangeX: srx,
      rangeY: sry,
      rangeZ: srz,
      spawnBand: sband,
    } = snowCfg;
    for (const child of sg.children) {
      const s = child as THREE.Sprite;
      const u = s.userData as SnowflakeUserData;
      s.position.y -= sfs * u.fallMul * dt;
      s.position.x += swx * swf * dt + Math.sin(t * u.wobbleX + u.phase) * wob * dt;
      s.position.z += Math.cos(t * u.wobbleZ + u.phase * 1.7) * wob * 0.85 * dt;
      s.rotation.z += u.spin * dt;
      if (s.position.y < 0) {
        s.position.y = sry + Math.random() * sband;
        s.position.x = (Math.random() - 0.5) * srx;
        s.position.z = (Math.random() - 0.5) * srz;
      }
    }
  });

  useEffect(() => {
    return () => {
      texture.dispose();
      material.dispose();
      snowMaterial.dispose();
    };
  }, [texture, material, snowMaterial]);

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
      <primitive object={snowGroup} />
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
