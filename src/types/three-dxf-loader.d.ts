declare module "three-dxf-loader" {
  import type { Font } from "three/addons/loaders/FontLoader.js";
  import type { LoadingManager, Object3D } from "three";

  export type DxfLoadResult = { entity: Object3D };

  export class DXFLoader {
    constructor(manager?: LoadingManager);
    setFont(font: Font): void;
    setEnableLayer(v: boolean): void;
    setDefaultColor(hex: number): void;
    setConsumeUnits(v: boolean): void;
    load(
      url: string,
      onLoad: (data: DxfLoadResult) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (err: unknown) => void
    ): void;
    loadString(
      str: string,
      onLoad: (data: DxfLoadResult) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (err: unknown) => void
    ): void;
    parse(data: string): DxfLoadResult;
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<DxfLoadResult>;
  }
}
