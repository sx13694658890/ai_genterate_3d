import { type ComponentPropsWithoutRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { paths } from "@/resources/paths";

export type CardProps = ComponentPropsWithoutRef<"group">;

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
 * 整车由 GLB 一次挂载，避免与合并后的节点树脱节。
 * 仅对上述节点绕本地 X 轴旋转，与原先轮毂/轮胎动画一致。
 */
export function Card(props: CardProps) {
  const { scene } = useGLTF(paths.models("card.glb"));
  const model = useMemo(() => scene.clone(true), [scene]);

  useFrame((_, delta) => {
    const speed = 4;
    model.traverse((obj) => {
      if (shouldSpinWheel(obj.name)) {
        obj.rotation.x += speed * delta;
      }
    });
  });

  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(paths.models("card.glb"));

export default Card;
