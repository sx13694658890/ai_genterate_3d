import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type DemoEntry = {
  id: string;
  title: string;
  description: string;
  /** 案例角标，用于侧栏与标题区展示 */
  tag?: string;
  Scene: LazyExoticComponent<ComponentType>;
};

export const demoRegistry: DemoEntry[] = [
  {
    id: "example-basic",
    tag: "入门",
    title: "基础立方体",
    description:
      "使用 @react-three/fiber + drei 环境光，材质由 three/materials 工厂创建，Leva 调节颜色与 PBR 参数。",
    Scene: lazy(() =>
      import("./example-basic").then((m) => ({ default: m.ExampleBasicScene }))
    ),
  },
  {
    id: "dxf-viewer",
    tag: "CAD",
    title: "DXF 图纸预览",
    description:
      "three-dxf-loader 将 DXF 转为 Three.js 实体；dxf-parser 同步解析展示实体数与 $ACADVER。含 public 样例与工程大文件切换。",
    Scene: lazy(() =>
      import("./dxf-viewer").then((m) => ({ default: m.DxfViewerScene }))
    ),
  },
  {
    id: "example-torus",
    tag: "几何",
    title: "环面体",
    description:
      "演示 three/lib/math 与 resources/paths 的引用方式（路径统一由 paths 管理，便于后续接贴图）。",
    Scene: lazy(() =>
      import("./example-torus").then((m) => ({ default: m.ExampleTorusScene }))
    ),
  },
  {
    id: "rain-scene",
    tag: "粒子",
    title: "下雨 (Sprite 粒子)",
    description:
      "参考 docs/雨滴粒子.md §5.1：Sprite 雨滴 + public/assets/textures/snow.png 雪花层，慢落与飘动模拟雨夹雪；程序化雨滴贴图 + 地面与雾效。",
    Scene: lazy(() =>
      import("./rain-scene").then((m) => ({ default: m.RainScene }))
    ),
  },
  {
    id: "rain-window-scene",
    tag: "着色器",
    title: "窗户雨 (rain.glsl)",
    description:
      "BigWings「Heartfelt」rain.glsl 全屏版（无 HAS_HEART）：玻璃雾、水痕、雨滴折射与 textureLod 景深；程序化窗外纹理；可选手动雨量或按住拖动。",
    Scene: lazy(() =>
      import("./rain-window-scene").then((m) => ({ default: m.RainWindowScene }))
    ),
  },
  {
    id: "room-scene",
    tag: "场景",
    title: "房间 (My Room 风格)",
    description:
      "风格参考 Bruno Simon「My Room in 3D」与 my-room-in-3d.vercel.app：暖色墙面、木地板、书桌双屏、台灯与窗光；原创低模几何，非原项目资源。",
    Scene: lazy(() =>
      import("./room-scene").then((m) => ({ default: m.RoomScene }))
    ),
  },
  {
    id: "ray-interaction",
    tag: "交互",
    title: "射线交互 (模型选择)",
    description:
      "参考 docs/射线原理交互.md：基于 Raycaster 和鼠标坐标转换，对 lion / bear 模型做点击拾取，并用 Html 卡片展示信息。",
    Scene: lazy(() =>
      import("./ray-interaction").then((m) => ({ default: m.RayInteractionScene }))
    ),
  },
  {
    id: "hai-scene",
    tag: "着色器",
    title: "海盗夜景海面 (hai.glsl)",
    description:
      "hai.glsl 全屏着色器；配乐在 Web Worker 合成。画布外简单「开始」层（非 drei Html），离开路由即中止并终止 Worker。",
    Scene: lazy(() => import("./hai-scene").then((m) => ({ default: m.HaiScene }))),
  },
  {
    id: "senlin-scene",
    tag: "着色器",
    title: "雨林地形 (main.glsl + senlin.glsl)",
    description:
      "Inigo Quilez 雨林 raymarch：地形与椭球树木、云层与反投影时间平滑；第二遍 senlin.glsl 做暗角与对比微调。半精度 ping-pong FBO。",
    Scene: lazy(() =>
      import("./senlin-scene").then((m) => ({ default: m.SenlinScene }))
    ),
  },
  {
    id: "universe-scene",
    tag: "着色器",
    title: "克尔-纽曼黑洞 (universe/*.glsl)",
    description:
      "shader_a 光线追踪 + TAA；shader_b 相机/键盘与 bloom 图集；shader_c/d 模糊；frag_img 合成。WASD 移动、RF 升降、QE 滚转，画布上拖动旋转视角。",
    Scene: lazy(() =>
      import("./universe-scene").then((m) => ({ default: m.UniverseScene }))
    ),
  },
];

export function getDemoById(id: string): DemoEntry | undefined {
  return demoRegistry.find((d) => d.id === id);
}
