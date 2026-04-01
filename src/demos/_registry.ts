import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type DemoEntry = {
  id: string;
  title: string;
  description: string;
  Scene: LazyExoticComponent<ComponentType>;
};

export const demoRegistry: DemoEntry[] = [
  {
    id: "example-basic",
    title: "基础立方体",
    description:
      "使用 @react-three/fiber + drei 环境光，材质由 three/materials 工厂创建，Leva 调节颜色与 PBR 参数。",
    Scene: lazy(() =>
      import("./example-basic").then((m) => ({ default: m.ExampleBasicScene }))
    ),
  },
  {
    id: "example-torus",
    title: "环面体",
    description:
      "演示 three/lib/math 与 resources/paths 的引用方式（路径统一由 paths 管理，便于后续接贴图）。",
    Scene: lazy(() =>
      import("./example-torus").then((m) => ({ default: m.ExampleTorusScene }))
    ),
  },
  {
    id: "rain-scene",
    title: "下雨 (Sprite 粒子)",
    description:
      "参考 docs/雨滴粒子.md §5.1：Sprite 始终面向相机、共享材质、竖向 scale 模拟雨滴，程序化 Canvas 贴图 + 地面与雾效。",
    Scene: lazy(() =>
      import("./rain-scene").then((m) => ({ default: m.RainScene }))
    ),
  },
  {
    id: "room-scene",
    title: "房间 (My Room 风格)",
    description:
      "风格参考 Bruno Simon「My Room in 3D」与 my-room-in-3d.vercel.app：暖色墙面、木地板、书桌双屏、台灯与窗光；原创低模几何，非原项目资源。",
    Scene: lazy(() =>
      import("./room-scene").then((m) => ({ default: m.RoomScene }))
    ),
  },
];

export function getDemoById(id: string): DemoEntry | undefined {
  return demoRegistry.find((d) => d.id === id);
}
