import * as THREE from "three";

/** 直线行驶速度（场景单位/s） */
export const STRAIGHT_DRIVE_SPEED = 6;

/** 世界空间前进方向（XZ，归一化后用于平移） */
export const WORLD_DRIVE_DIRECTION = new THREE.Vector3(0, 0, 1);

/**
 * 模型在 **车身 rig 局部** 中「车头」指向（仅 XZ 参与，Y 置 0）。
 * Three.js 中常见为 +Z；若 GLB 内模型已旋转，可改为 (1,0,0) 或 (0,0,-1) 等。
 */
export const MODEL_FORWARD_LOCAL = new THREE.Vector3(0, 0, 1);

/** 角速度符号：轮胎看起来倒转时改为 -1 */
export const WHEEL_OMEGA_SIGN = -1;

export const WHEEL_ROLLING_RADIUS = 0.34;

export const STRAIGHT_PATH_Z_MIN = -35;
export const STRAIGHT_PATH_Z_MAX = 35;

const _driveDir = new THREE.Vector3();
const _mf = new THREE.Vector3();

/** 世界空间水平前进方向（XZ）→ 车身 rig 的 rotation.y */
export function getYawForWorldForwardXZ(worldForward: THREE.Vector3): number {
  _driveDir.copy(worldForward);
  _driveDir.y = 0;
  if (_driveDir.lengthSq() < 1e-8) _driveDir.set(0, 0, 1);
  else _driveDir.normalize();

  _mf.copy(MODEL_FORWARD_LOCAL);
  _mf.y = 0;
  if (_mf.lengthSq() < 1e-8) return Math.atan2(_driveDir.x, _driveDir.z);
  _mf.normalize();

  return Math.atan2(_driveDir.x, _driveDir.z) - Math.atan2(_mf.x, _mf.z);
}

export function getDriveYaw(): number {
  return getYawForWorldForwardXZ(WORLD_DRIVE_DIRECTION);
}

/**
 * 轮轴与**实际行驶方向**垂直（车身左右）：worldUp × driveDir。
 * 与用 yaw 推导等价当且仅当车身已正确对准行驶方向；这里直接用速度方向更稳。
 */
export function getWheelAxleFromDriveDirection(
  driveDirXZ: THREE.Vector3,
  out: THREE.Vector3,
): THREE.Vector3 {
  _driveDir.copy(driveDirXZ);
  _driveDir.y = 0;
  if (_driveDir.lengthSq() < 1e-8) _driveDir.set(0, 0, 1);
  else _driveDir.normalize();
  return out.crossVectors(THREE.Object3D.DEFAULT_UP, _driveDir).normalize();
}
