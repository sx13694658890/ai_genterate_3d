import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { disposeMaterial } from "@/three/lib/dispose";
import {
  createRoomBook,
  createRoomDeskWood,
  createRoomFloorWood,
  createRoomLampShade,
  createRoomPlasticDark,
  createRoomRug,
  createRoomScreenGlow,
  createRoomScreenGlowAlt,
  createRoomWallAccent,
  createRoomWallCream,
} from "@/three/materials/presets/room";

/** 风格与构图参考：https://github.com/brunosimon/my-room-in-3d 与线上演示，场景为原创低模几何。 */
export function RoomScene() {
  const { ambient, lamp, fill, sunWindow } = useControls("房间光照", {
    ambient: { value: 0.32, min: 0.05, max: 0.8, step: 0.02 },
    lamp: { value: 1.15, min: 0, max: 3, step: 0.05 },
    fill: { value: 0.22, min: 0, max: 1, step: 0.02 },
    sunWindow: { value: 0.55, min: 0, max: 2, step: 0.05 },
  });

  const mats = useMemo(
    () => ({
      floor: createRoomFloorWood(),
      wall: createRoomWallCream(),
      accent: createRoomWallAccent(),
      desk: createRoomDeskWood(),
      plastic: createRoomPlasticDark(),
      screen: createRoomScreenGlow(),
      screen2: createRoomScreenGlowAlt(),
      rug: createRoomRug(),
      lamp: createRoomLampShade(),
      book1: createRoomBook("#8b3a4a"),
      book2: createRoomBook("#2f5d50"),
      book3: createRoomBook("#c9a227"),
      windowEmissive: new THREE.MeshStandardMaterial({
        color: "#87ceeb",
        emissive: "#b8e8ff",
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0,
        transparent: true,
        opacity: 0.92,
      }),
    }),
    []
  );

  useEffect(() => {
    return () => {
      Object.values(mats).forEach(disposeMaterial);
    };
  }, [mats]);

  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(3.2, 2.05, 4.1);
    camera.near = 0.08;
    camera.far = 80;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 1.1, -0.6);
  }, [camera]);

  const W = 5.8;
  const D = 4.2;
  const H = 2.65;
  const wallY = H / 2;

  /** 书桌：桌腿底贴地 → 腿顶与桌面底同一高度 → 摆件底贴桌面顶 */
  const deskLegHeight = 0.72;
  const deskLegHalf = deskLegHeight / 2;
  const deskLegCenterY = deskLegHalf;
  const deskTopThickness = 0.055;
  const deskTopBottomY = deskLegHeight;
  const deskTopCenterY = deskTopBottomY + deskTopThickness / 2;
  const deskTopSurfaceY = deskTopCenterY + deskTopThickness / 2;

  const mainBezelH = 0.32;
  const mainScreenH = 0.26;
  const mainMonitorY = deskTopSurfaceY + mainBezelH / 2;
  const mainScreenY = deskTopSurfaceY + mainScreenH / 2;

  const sideBezelH = 0.22;
  const sideScreenH = 0.17;
  const sideMonitorY = deskTopSurfaceY + sideBezelH / 2;
  const sideScreenY = deskTopSurfaceY + sideScreenH / 2;

  const lampStemH = 0.22;
  const lampStemHalf = lampStemH / 2;
  const lampStemCenterY = deskTopSurfaceY + lampStemHalf;
  const lampShadeR = 0.11;
  const lampShadeCenterY = lampStemCenterY + lampStemHalf + lampShadeR;

  return (
    <>
      <color attach="background" args={["#1a1d24"]} />
      <ambientLight intensity={ambient} color="#f4f1ea" />
      <directionalLight
        position={[-2.2, 3.4, 2.8]}
        intensity={fill}
        color="#ffe8d6"
      />
      <pointLight
        position={[0.55 + 0.85, lampShadeCenterY - 0.05, -0.85 - 0.05]}
        intensity={lamp}
        distance={6}
        decay={2}
        color="#ffecd1"
      />
      <group position={[0, 0, 0]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} material={mats.floor}>
          <planeGeometry args={[W, D]} />
        </mesh>

        <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, -0.2]} material={mats.rug}>
          <planeGeometry args={[2.2, 1.5]} />
        </mesh>

        <mesh position={[0, wallY, -D / 2 + 0.02]} material={mats.wall}>
          <planeGeometry args={[W, H]} />
        </mesh>
        <mesh
          position={[-W / 2 + 0.02, wallY, 0]}
          rotation-y={Math.PI / 2}
          material={mats.accent}
        >
          <planeGeometry args={[D, H]} />
        </mesh>
        <mesh
          position={[W / 2 - 0.02, wallY, 0]}
          rotation-y={-Math.PI / 2}
          material={mats.wall}
        >
          <planeGeometry args={[D, H]} />
        </mesh>

        <mesh position={[-1.1, 1.35, -D / 2 + 0.03]} material={mats.windowEmissive}>
          <planeGeometry args={[1.35, 0.95]} />
        </mesh>
        <directionalLight
          position={[-1.2, 2.2, -6]}
          intensity={sunWindow}
          color="#d8efff"
        />

        <group position={[0.55, 0, -0.85]}>
          <mesh position={[0, deskTopCenterY, 0]} material={mats.desk}>
            <boxGeometry args={[1.55, deskTopThickness, 0.72]} />
          </mesh>
          {[
            [-0.62, deskLegCenterY, -0.28],
            [0.62, deskLegCenterY, -0.28],
            [-0.62, deskLegCenterY, 0.28],
            [0.62, deskLegCenterY, 0.28],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]} material={mats.plastic}>
              <boxGeometry args={[0.06, deskLegHeight, 0.06]} />
            </mesh>
          ))}

          <mesh position={[-0.35, mainMonitorY, -0.12]} material={mats.plastic}>
            <boxGeometry args={[0.22, mainBezelH, 0.05]} />
          </mesh>
          <mesh position={[-0.35, mainScreenY, -0.11]} material={mats.screen}>
            <boxGeometry args={[0.19, mainScreenH, 0.02]} />
          </mesh>

          <mesh position={[0.22, sideMonitorY, -0.1]} material={mats.plastic}>
            <boxGeometry args={[0.34, sideBezelH, 0.04]} />
          </mesh>
          <mesh position={[0.22, sideScreenY, -0.09]} material={mats.screen2}>
            <boxGeometry args={[0.3, sideScreenH, 0.02]} />
          </mesh>

          <mesh position={[0.85, lampShadeCenterY, -0.05]} material={mats.lamp}>
            <sphereGeometry args={[lampShadeR, 16, 16]} />
          </mesh>
          <mesh position={[0.85, lampStemCenterY, -0.05]} material={mats.plastic}>
            <cylinderGeometry args={[0.02, 0.035, lampStemH, 8]} />
          </mesh>
        </group>

        <group position={[-0.15, 0, 0.35]} rotation-y={0.35}>
          <mesh position={[0, 0.35, 0]} material={mats.plastic}>
            <boxGeometry args={[0.42, 0.08, 0.42]} />
          </mesh>
          <mesh position={[0, 0.72, 0.05]} material={mats.plastic}>
            <boxGeometry args={[0.38, 0.65, 0.06]} />
          </mesh>
        </group>

        <group position={[-2.15, 1.45, -D / 2 + 0.08]}>
          <mesh position={[0, 0, 0]} material={mats.desk}>
            <boxGeometry args={[1.1, 0.06, 0.28]} />
          </mesh>
          {[
            [0.32, 0.12, 0],
            [0, 0.12, 0],
            [-0.32, 0.12, 0],
          ].map((p, i) => (
            <mesh
              key={i}
              position={p as [number, number, number]}
              rotation-z={i * 0.04 - 0.04}
              material={i === 0 ? mats.book1 : i === 1 ? mats.book2 : mats.book3}
            >
              <boxGeometry args={[0.08, 0.22, 0.18]} />
            </mesh>
          ))}
        </group>
      </group>

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.45}
        scale={14}
        blur={2.2}
        far={3.5}
        color="#1a1a22"
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        target={[0, 1, -0.5]}
        minDistance={2.2}
        maxDistance={9}
        maxPolarAngle={Math.PI * 0.48}
      />
    </>
  );
}
