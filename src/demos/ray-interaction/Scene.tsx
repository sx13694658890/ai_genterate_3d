import { Environment, Html, Line, OrbitControls } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { paths } from "@/resources/paths";
import Card from "./Card.tsx";
import { Model as City } from "./City.tsx";

type RayObjectId = "city";

type RayHitInfo = {
  id: RayObjectId;
  object: THREE.Object3D;
  name: string;
  point: THREE.Vector3;
  distance: number;
};

export function RayInteractionScene() {
  const [selected, setSelected] = useState<RayHitInfo | null>(null);

  const { camera, controls } = useThree() as {
    camera: THREE.PerspectiveCamera;
    controls: any | undefined;
  };

  const initialCamPos = useRef(new THREE.Vector3(18, 10, 22));
  const initialCamTarget = useRef(new THREE.Vector3(0, 4, 0));
  const targetCamPos = useRef(initialCamPos.current.clone());
  const targetCamTarget = useRef(initialCamTarget.current.clone());
  const isMoving = useRef(false);

  useEffect(() => {
    camera.position.copy(initialCamPos.current);
    camera.lookAt(initialCamTarget.current);
  }, [camera]);

  useFrame((_, delta) => {
    // 相机平滑插值到目标位置与目标朝向，仅在“前进动画进行中”时执行
    if (isMoving.current) {
      const lerpFactor = 1 - Math.pow(0.001, delta);
      camera.position.lerp(targetCamPos.current, lerpFactor);
      if (controls && targetCamTarget.current) {
        controls.target.lerp(targetCamTarget.current, lerpFactor);
        controls.update();
      } else {
        camera.lookAt(targetCamTarget.current);
      }
      // 到达目标后停止插值，恢复用户自由控制
      if (camera.position.distanceTo(targetCamPos.current) < 0.05) {
        isMoving.current = false;
      }
    }

    const root = cityRoot.current;
    if (!root) return;
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mesh.userData.__baseEmissive) {
          mesh.userData.__baseEmissive = mat.emissive.clone();
        }
        const base: THREE.Color = mesh.userData.__baseEmissive;
        const isSelected =
          !!selected &&
          (selected.object === mesh || selected.object === child || selected.object === root);
        if (isSelected) {
          mat.emissive.copy(base).lerp(new THREE.Color("#ffbf7f"), 0.7);
          mat.emissiveIntensity = 1.2;
        } else {
          mat.emissive.copy(base);
          mat.emissiveIntensity = 0.5;
        }
      }
    });
  });

  const cityRoot = useRef<THREE.Group>(null);

  useEffect(() => {
    if (cityRoot.current) {
      cityRoot.current.userData.rayId = "city" as RayObjectId;
    }
  }, []);

  const handleClick =
    (id: RayObjectId) =>
    (e: ThreeEvent<MouseEvent>): void => {
      e.stopPropagation();
      const point = e.point.clone();
      const distance = e.distance ?? e.ray.origin.distanceTo(point);
      const object = e.object as THREE.Object3D;
      const rawName =
        (object as any).name ||
        (object.parent as any)?.name ||
        (object.userData && (object.userData.label as string)) ||
        "";
      const displayName = rawName || "未命名建筑";
      const info: RayHitInfo = {
        id,
        object,
        name: displayName,
        point,
        distance,
      };
      setSelected(info);
    };

  const handlePointerOver = (): void => {
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (): void => {
    document.body.style.cursor = "default";
  };

  const handleMoveForward = (): void => {
    // 简单示例：向城市内部“走近”一点，同时略微下降高度
    targetCamPos.current.set(10, 6, 14);
    targetCamTarget.current.set(0, 3.5, 0);
    isMoving.current = true;
  };

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <hemisphereLight args={["#64748b", "#020617", 0.45]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 14, 6]} intensity={1.1} color="#e5eefc" />
      <Environment files={paths.env("hdr/022.hdr")} background blur={1} />

      <group position={[0, 0, 0]}>
        {/* 地面前进提示标记：点击后相机前进 */}
        <mesh
          position={[0, 0.05, 6]}
          rotation-x={-Math.PI / 2}
          onClick={handleMoveForward}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <ringGeometry args={[0.5, 0.9, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
        </mesh>

        <group
          ref={cityRoot}
          position={[0, 0, 0]}
          onClick={handleClick("city")}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <City />
        </group>

        {/* 车辆模型：放置在城市道路上，保持与道路方向对齐 */}
        <group position={[0, 0.01, 4]}>
          <Card scale={0.8} />
        </group>
      </group>

      {selected && (
        <>
          <Line
            points={[
              [selected.point.x, selected.point.y, selected.point.z],
              [selected.point.x, selected.point.y + 2, selected.point.z],
            ]}
            color="#38bdf8"
            transparent
            opacity={0.9}
            lineWidth={1}
          />

          <Html
            position={[selected.point.x, selected.point.y + 2.05, selected.point.z]}
            distanceFactor={6}
            transform
            occlude
          >
            <div className="rounded-xl border border-sky-400/40 bg-slate-950/90 px-4 py-3 text-xs shadow-lg shadow-sky-500/20">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                射线命中对象
              </div>
              <div className="text-sm font-medium text-sky-100">
                {selected.name}
              </div>
              <div className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-slate-300">
                点击城市中的局部建筑，R3F 会在 3D 空间中找到交点，并通过这条连线将命中位置与说明卡片连接起来。
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                距离摄像机：{selected.distance.toFixed(2)}
              </div>
            </div>
          </Html>
        </>
      )}

      <OrbitControls makeDefault enableDamping dampingFactor={0.06} target={[0, 1, 0]} />
    </>
  );
}

