import { type ComponentPropsWithoutRef, type MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { paths } from "@/resources/paths";
import {
  WORLD_DRIVE_DIRECTION,
  WHEEL_OMEGA_SIGN,
  WHEEL_ROLLING_RADIUS,
  getWheelAxleFromDriveDirection,
} from "./straightDrive";

export type CardProps = ComponentPropsWithoutRef<"group"> & {
  /** 车身根节点（与 Scene 中移动/转向的 group 同一 ref），用于计算世界轮轴 */
  carRigRef: MutableRefObject<THREE.Group | null>;
  driveLinearSpeedRef?: MutableRefObject<number>;
  /** 每帧更新的世界空间水平前进方向；未传时用直线演示默认方向 */
  driveDirectionRef?: MutableRefObject<THREE.Vector3>;
};

/** 合并轮胎后的 GLB 中与轮子相关的节点名（与 Blender / glTF 导出一致） */
const WHEEL_SPIN_NAMES = [
  "Guma03.002",
  "Object22",
  "前轮毂",
  "右后轮毂",
  "左后轮毂",
] as const;

function shouldSpinWheel(name: string): boolean {
  return (WHEEL_SPIN_NAMES as readonly string[]).includes(name);
}

/**
 * 车轮绕**世界空间轮轴**转动（车身左右 = up×车头），与直线前进方向一致；
 * 不再使用 mesh.rotation.x（在模型带 Y 旋转时易与前进垂直，看起来像横滑）。
 */
const _wheelDir = new THREE.Vector3();

export function Card(props: CardProps) {
  const { carRigRef, driveLinearSpeedRef, driveDirectionRef, ...rest } = props;
  void carRigRef;
  const { scene } = useGLTF(paths.models("card.glb"));
  const model = useMemo(() => scene.clone(true), [scene]);
  const axleWorld = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const src = driveDirectionRef?.current ?? WORLD_DRIVE_DIRECTION;
    _wheelDir.copy(src);
    _wheelDir.y = 0;
    if (_wheelDir.lengthSq() < 1e-10) _wheelDir.set(0, 0, 1);
    else _wheelDir.normalize();
    getWheelAxleFromDriveDirection(_wheelDir, axleWorld.current);
    const v = driveLinearSpeedRef?.current ?? 0;
    const omega =
      WHEEL_ROLLING_RADIUS > 1e-6 ? (WHEEL_OMEGA_SIGN * v) / WHEEL_ROLLING_RADIUS : 0;
    model.traverse((obj) => {
      if (shouldSpinWheel(obj.name)) {
        obj.rotateOnWorldAxis(axleWorld.current, omega * delta);
      }
    });
  });

  return (
    <group {...rest} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(paths.models("card.glb"));

export default Card;
