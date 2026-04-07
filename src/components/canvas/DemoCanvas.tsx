import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";
import * as THREE from "three";
import { defaultToneMapping, defaultToneMappingExposure } from "@/three/lib/constants";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";

type DemoCanvasProps = {
  children: ReactNode;
  /** 叠在画布上的 DOM（如 hai-scene 启动层），须依赖父级 `relative` 定位 */
  overlay?: ReactNode;
};

export function DemoCanvas({ children, overlay }: DemoCanvasProps) {
  return (
    <CanvasErrorBoundary>
      <div className="relative h-[min(70vh,560px)] w-full overflow-hidden rounded-xl border border-border/80 bg-card/40 shadow-[0_0_0_1px_hsl(var(--border)/0.5),0_20px_50px_-12px_rgba(0,0,0,0.55)] ring-1 ring-primary/10 backdrop-blur-sm transition-shadow duration-500 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_24px_60px_-12px_rgba(0,0,0,0.6)]">
        <Canvas
          camera={{ position: [2.8, 1.8, 3.6], fov: 45, near: 0.1, far: 200 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMapping: defaultToneMapping,
            toneMappingExposure: defaultToneMappingExposure,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
        {overlay}
      </div>
    </CanvasErrorBoundary>
  );
}
