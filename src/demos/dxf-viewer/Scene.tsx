import { Grid, OrbitControls } from "@react-three/drei";
import type { RefObject } from "react";
import { Suspense, use, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import DxfParser from "dxf-parser";
import { useControls } from "leva";
import * as THREE from "three";
import type { Font } from "three/addons/loaders/FontLoader.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { DXFLoader } from "three-dxf-loader";
import { disposeMaterial } from "@/three/lib/dispose";

function publicBase(): string {
  return (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
}

const FONT_URL = `${publicBase()}fonts/helvetiker_regular.typeface.json`;
const SAMPLE_DXF_URL = `${publicBase()}dxf-sample.dxf`;
const LARGE_DXF_URL = `${publicBase()}${encodeURIComponent("D10 EVVC(M18)咀芯加工图.dxf")}`;

type DxfMeta = {
  entityCount: number;
  acadver: string | undefined;
};

function useDxfFileMeta(url: string): DxfMeta | null {
  const [meta, setMeta] = useState<DxfMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = new DxfParser().parseSync(text);
        if (!parsed) {
          setMeta(null);
          return;
        }
        const entities = parsed.entities;
        const rawVer = (parsed.header as Record<string, unknown>)["$ACADVER"];
        const acadver = typeof rawVer === "string" ? rawVer : rawVer != null ? String(rawVer) : undefined;
        setMeta({
          entityCount: Array.isArray(entities) ? entities.length : 0,
          acadver,
        });
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return meta;
}

function disposeDxfRoot(root: THREE.Object3D): void {
  root.traverse((o) => {
    const obj = o as THREE.Mesh & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    obj.geometry?.dispose();
    const m = obj.material;
    if (!m) return;
    if (Array.isArray(m)) m.forEach(disposeMaterial);
    else disposeMaterial(m);
  });
}

function loadDxfEntity(font: Font, url: string): Promise<THREE.Object3D> {
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(
      (text) =>
        new Promise<THREE.Object3D>((resolve, reject) => {
          const loader = new DXFLoader();
          loader.setFont(font);
          loader.setEnableLayer(true);
          /** 若为 true，会按 $INSUNITS 等缩放到米，小图纸易被缩成几乎看不见 */
          loader.setConsumeUnits(false);
          loader.setDefaultColor(0x152238);
          loader.loadString(
            text,
            (data) => resolve(data.entity),
            undefined,
            (err) => reject(err instanceof Error ? err : new Error(String(err)))
          );
        })
    );
}

type ControlsLike = {
  target: THREE.Vector3;
  update: () => void;
};

/**
 * 将相机与 OrbitControls 目标对准包围盒。loader 产出多在 XY 平面（Z=0），
 * 在 Y 朝上的 Three 里像「竖着的纸」，需由外层 group 旋转到 XZ 后再算盒体。
 */
function FitPerspectiveToObject({
  rootRef,
  fitRevision,
}: {
  rootRef: RefObject<THREE.Group | null>;
  /** entity 或 url 变化时触发重新贴合 */
  fitRevision: unknown;
}) {
  const { camera, controls } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const root = rootRef.current;
    if (!root) return;

    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      const dist = (maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.35;
      const dir = new THREE.Vector3(1.15, 0.95, 1).normalize();
      camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
      camera.near = Math.max(dist / 2000, 0.001);
      camera.far = dist * 200;
      camera.updateProjectionMatrix();
      camera.lookAt(center);

      const oc = controls as ControlsLike | null;
      if (oc?.target) {
        oc.target.copy(center);
        oc.update();
      }
    } else {
      camera.position.set(4, 3, 6);
      camera.lookAt(0, 0, 0);
    }
  }, [camera, controls, rootRef, fitRevision]);

  return null;
}

type DxfModelProps = {
  url: string;
};

function DxfModel({ url }: DxfModelProps) {
  const font = useLoader(FontLoader, FONT_URL);
  const entityPromise = useMemo(() => loadDxfEntity(font, url), [font, url]);
  const entity = use(entityPromise);
  const rootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    return () => disposeDxfRoot(entity);
  }, [entity]);

  /**
   * loader 默认把 2D 图放在 XY（Z=0），相当于竖在场景里；绕 X +90° 映射到 XZ，
   * 与 drei 无限网格同一「地面」方向，才看得到线框与标注。
   */
  return (
    <>
      <group ref={rootRef} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={entity} />
      </group>
      <FitPerspectiveToObject rootRef={rootRef} fitRevision={entity.uuid} />
    </>
  );
}

/**
 * DXF：three-dxf-loader 生成 Three.js 实体；dxf-parser 解析同名文件展示版本与实体数量。
 * 样例为小图纸；工程图为仓库 public 下大文件，首次加载可能较慢。
 */
export function DxfViewerScene() {
  const { 图纸 } = useControls("DXF 图纸", {
    图纸: { value: "sample", options: { 样例小图: "sample", 工程图大文件: "large" } },
  });

  const url = 图纸 === "large" ? LARGE_DXF_URL : SAMPLE_DXF_URL;
  const meta = useDxfFileMeta(url);

  useControls(
    "DXF 解析 (dxf-parser)",
    () => ({
      实体条目数: { value: meta ? String(meta.entityCount) : "加载中…", editable: false },
      ACAD版本: { value: meta?.acadver ?? "—", editable: false },
    }),
    [meta]
  );

  return (
    <>
      <color attach="background" args={["#e8edf2"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 6]} intensity={1.05} castShadow={false} />
      <hemisphereLight args={["#f2f6ff", "#9aa3ad", 0.35]} />
      <Grid
        infiniteGrid
        fadeDistance={120}
        fadeStrength={1.2}
        sectionColor="#9fb0c4"
        cellColor="#c5ced8"
        sectionThickness={1}
        cellThickness={0.6}
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      <Suspense key={url} fallback={null}>
        <DxfModel url={url} />
      </Suspense>
    </>
  );
}
