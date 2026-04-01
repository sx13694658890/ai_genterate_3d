import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";
import * as THREE from "three";
import { defaultToneMapping, defaultToneMappingExposure } from "@/three/lib/constants";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";

type DemoCanvasProps = {
  children: ReactNode;
};

export function DemoCanvas({ children }: DemoCanvasProps) {
  return (
    <CanvasErrorBoundary>
      <div className="h-[min(70vh,560px)] w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 shadow-inner">
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
      </div>
    </CanvasErrorBoundary>
  );
}
