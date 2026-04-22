import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  buildSenlinMainFragmentShader,
  buildSenlinPostFragmentShader,
  senlinVertexShader,
} from "@/three/shader/senlin/buildSenlinShader";

function SenlinOrthographicCamera() {
  const { set } = useThree();
  useLayoutEffect(() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    cam.position.set(0, 0, 1);
    cam.updateProjectionMatrix();
    set({ camera: cam });
  }, [set]);
  return null;
}

function createSenlinRenderTarget(w: number, h: number): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  return rt;
}

/**
 * 雨林：main.glsl 全屏 raymarch + 帧反馈；senlin.glsl 为最终压暗与轻微暗角。
 */
export function SenlinScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport, gl, scene } = useThree();
  const frameRef = useRef(0);
  const readRtRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const writeRtRef = useRef<THREE.WebGLRenderTarget | null>(null);

  const { timeScale } = useControls("雨林 (main.glsl)", {
    timeScale: { value: 1, min: 0, max: 2, step: 0.05 },
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  const mainMaterial = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: senlinVertexShader,
        fragmentShader: buildSenlinMainFragmentShader(),
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new THREE.Vector2(1, 1) },
          iChannel0: { value: null as unknown as THREE.Texture },
          iFrame: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const postMaterial = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: senlinVertexShader,
        fragmentShader: buildSenlinPostFragmentShader(),
        uniforms: {
          iResolution: { value: new THREE.Vector2(1, 1) },
          iChannel0: { value: null as unknown as THREE.Texture },
        },
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const syncRenderTargets = (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    const disposeRt = (rt: THREE.WebGLRenderTarget | null) => {
      if (rt) rt.dispose();
    };
    disposeRt(readRtRef.current);
    disposeRt(writeRtRef.current);
    readRtRef.current = createSenlinRenderTarget(w, h);
    writeRtRef.current = createSenlinRenderTarget(w, h);
    frameRef.current = 0;
  };

  useLayoutEffect(() => {
    const w = Math.max(1, Math.floor(size.width * viewport.dpr));
    const h = Math.max(1, Math.floor(size.height * viewport.dpr));
    syncRenderTargets(w, h);
    return () => {
      readRtRef.current?.dispose();
      writeRtRef.current?.dispose();
      readRtRef.current = null;
      writeRtRef.current = null;
    };
  }, [size.width, size.height, viewport.dpr]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      mainMaterial.dispose();
      postMaterial.dispose();
    };
  }, [geometry, mainMaterial, postMaterial]);

  useFrame((state) => {
    const mesh = meshRef.current;
    const readRt = readRtRef.current;
    const writeRt = writeRtRef.current;
    if (!mesh || !readRt || !writeRt) return;

    const w = Math.max(1, Math.floor(size.width * viewport.dpr));
    const h = Math.max(1, Math.floor(size.height * viewport.dpr));
    if (readRt.width !== w || readRt.height !== h) {
      syncRenderTargets(w, h);
      return;
    }

    const mainMat = mainMaterial;
    const postMat = postMaterial;

    mainMat.uniforms.iTime.value = state.clock.elapsedTime * timeScale;
    mainMat.uniforms.iResolution.value.set(w, h);
    mainMat.uniforms.iChannel0.value = readRt.texture;
    mainMat.uniforms.iFrame.value = frameRef.current;

    mesh.material = mainMat;
    gl.setRenderTarget(writeRt);
    gl.render(scene, state.camera);
    gl.setRenderTarget(null);

    postMat.uniforms.iResolution.value.set(w, h);
    postMat.uniforms.iChannel0.value = writeRt.texture;
    mesh.material = postMat;

    frameRef.current += 1;

    const tmp = readRtRef.current;
    readRtRef.current = writeRtRef.current;
    writeRtRef.current = tmp;
  });

  return (
    <>
      <SenlinOrthographicCamera />
      <mesh ref={meshRef} geometry={geometry} frustumCulled={false} />
    </>
  );
}
