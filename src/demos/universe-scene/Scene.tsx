import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  buildUniverseBufferAFragmentShader,
  buildUniverseBufferBFragmentShader,
  buildUniverseBufferCFragmentShader,
  buildUniverseBufferDFragmentShader,
  buildUniverseImageFragmentShader,
  universeVertexShader,
  type UniverseRaymarchQuality,
} from "@/three/shader/universe/buildUniverseShader";

/** 将内部 RT 双线性放大到画布，避免 frag_img 在 4K 屏上逐像素跑 tonemap */
const universeUpscaleFragment = `precision highp float;
uniform vec2 uFullRes;
uniform sampler2D uTex;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uFullRes;
  fragColor = texture(uTex, uv);
}
`;

function computeUniverseInternalSize(
  cssW: number,
  cssH: number,
  viewportDpr: number,
  opts: { renderScale: number; maxDpr: number; maxLongSide: number }
): { w: number; h: number; fullW: number; fullH: number } {
  const fullW = Math.max(1, Math.floor(cssW * viewportDpr));
  const fullH = Math.max(1, Math.floor(cssH * viewportDpr));
  const d = Math.min(viewportDpr, Math.max(0.5, opts.maxDpr));
  let w = Math.max(1, Math.floor(cssW * d * opts.renderScale));
  let h = Math.max(1, Math.floor(cssH * d * opts.renderScale));
  const cap = opts.maxLongSide;
  if (cap > 0) {
    const long = Math.max(w, h);
    if (long > cap) {
      const k = cap / long;
      w = Math.max(1, Math.floor(w * k));
      h = Math.max(1, Math.floor(h * k));
    }
  }
  return { w, h, fullW, fullH };
}

const KEYCODE: Partial<Record<string, number>> = {
  KeyW: 87,
  KeyA: 65,
  KeyS: 83,
  KeyD: 68,
  KeyQ: 81,
  KeyE: 69,
  KeyR: 82,
  KeyF: 70,
};

function UniverseOrthographicCamera() {
  const { set } = useThree();
  useLayoutEffect(() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    cam.position.set(0, 0, 1);
    cam.updateProjectionMatrix();
    set({ camera: cam });
  }, [set]);
  return null;
}

function createUniverseRenderTarget(w: number, h: number): THREE.WebGLRenderTarget {
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

function createKeyTexture(): THREE.DataTexture {
  const data = new Uint8Array(256 * 4);
  const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function syncKeyTexture(tex: THREE.DataTexture, keys: Set<number>): void {
  const data = tex.image.data as Uint8Array;
  data.fill(0);
  keys.forEach((code) => {
    if (code >= 0 && code < 256) data[code * 4] = 255;
  });
  tex.needsUpdate = true;
}

/**
 * Shadertoy 式多 Buffer：shader_a（黑洞）↔ 历史；shader_b（相机/键盘 + bloom 图集）；
 * shader_c/d 高斯模糊；frag_img 合成与 tonemap。
 *
 * 性能：① 内部降分辨率 + 放大合成；② shader_a 可选「射线品质」缩短主 march/子循环、低档位关闭热浪折射。
 */
export function UniverseScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport, gl, scene, clock } = useThree();
  const frameRef = useRef(0);
  const keysRef = useRef(new Set<number>());
  const pointerDownRef = useRef(false);
  const internalResRef = useRef({ w: 1, h: 1, fullW: 1, fullH: 1 });

  const aReadRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const aWriteRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const bReadRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const bWriteRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const cRtRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const dRtRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const imgRtRef = useRef<THREE.WebGLRenderTarget | null>(null);

  const {
    timeScale,
    渲染缩放: renderScale,
    限制像素比: maxDpr,
    最长边上限: maxLongSide,
    射线品质: raymarchQuality,
  } = useControls("宇宙 / 黑洞 (universe)", {
    timeScale: { value: 1, min: 0, max: 2, step: 0.05 },
    渲染缩放: {
      value: 0.52,
      min: 0.28,
      max: 1,
      step: 0.02,
      hint: "内部 RT 相对画布比例，越小越快",
    },
    限制像素比: {
      value: 1.1,
      min: 0.75,
      max: 2,
      step: 0.05,
      hint: "封顶设备 DPR，Retina 上建议 ≤1.2",
    },
    最长边上限: {
      value: 1280,
      options: { 无上限: 0, "960": 960, "1280": 1280, "1600": 1600, "1920": 1920 },
      hint: "内部缓冲最长边像素上限，0 表示不限制",
    },
    射线品质: {
      value: "low",
      options: { 流畅优先: "low", 平衡: "medium", 画质优先: "high" },
      hint: "改 Buffer A 步进/热浪等；切换会重链着色器",
    },
  });

  const keyTex = useMemo(() => createKeyTexture(), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  const quality = raymarchQuality as UniverseRaymarchQuality;

  const matA = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: universeVertexShader,
        fragmentShader: buildUniverseBufferAFragmentShader(quality),
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new THREE.Vector2(1, 1) },
          iFrame: { value: 0 },
          iChannel2: { value: null as unknown as THREE.Texture },
          iChannel3: { value: null as unknown as THREE.Texture },
          iChannelResolution2: { value: new THREE.Vector3(1, 1, 1) },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [quality]
  );

  useEffect(() => {
    frameRef.current = 0;
  }, [quality]);

  const matB = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: universeVertexShader,
        fragmentShader: buildUniverseBufferBFragmentShader(),
        uniforms: {
          iTime: { value: 0 },
          iTimeDelta: { value: 0 },
          iResolution: { value: new THREE.Vector2(1, 1) },
          iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
          iFrame: { value: 0 },
          iChannel0: { value: null as unknown as THREE.Texture },
          iChannel1: { value: null as unknown as THREE.Texture },
          iChannel3: { value: keyTex },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [keyTex]
  );

  const matC = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: universeVertexShader,
        fragmentShader: buildUniverseBufferCFragmentShader(),
        uniforms: {
          iResolution: { value: new THREE.Vector2(1, 1) },
          iChannel0: { value: null as unknown as THREE.Texture },
        },
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const matD = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: universeVertexShader,
        fragmentShader: buildUniverseBufferDFragmentShader(),
        uniforms: {
          iResolution: { value: new THREE.Vector2(1, 1) },
          iChannel0: { value: null as unknown as THREE.Texture },
        },
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const matImg = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: universeVertexShader,
        fragmentShader: buildUniverseImageFragmentShader(),
        uniforms: {
          iResolution: { value: new THREE.Vector2(1, 1) },
          iChannel0: { value: null as unknown as THREE.Texture },
          iChannel3: { value: null as unknown as THREE.Texture },
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  const matUpscale = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: universeVertexShader,
        fragmentShader: universeUpscaleFragment,
        uniforms: {
          uFullRes: { value: new THREE.Vector2(1, 1) },
          uTex: { value: null as unknown as THREE.Texture },
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  const disposeRt = (rt: THREE.WebGLRenderTarget | null) => {
    rt?.dispose();
  };

  const syncRenderTargets = (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    disposeRt(aReadRef.current);
    disposeRt(aWriteRef.current);
    disposeRt(bReadRef.current);
    disposeRt(bWriteRef.current);
    disposeRt(cRtRef.current);
    disposeRt(dRtRef.current);
    disposeRt(imgRtRef.current);
    aReadRef.current = createUniverseRenderTarget(w, h);
    aWriteRef.current = createUniverseRenderTarget(w, h);
    bReadRef.current = createUniverseRenderTarget(w, h);
    bWriteRef.current = createUniverseRenderTarget(w, h);
    cRtRef.current = createUniverseRenderTarget(w, h);
    dRtRef.current = createUniverseRenderTarget(w, h);
    imgRtRef.current = createUniverseRenderTarget(w, h);
    frameRef.current = 0;
  };

  useLayoutEffect(() => {
    const { w, h } = computeUniverseInternalSize(size.width, size.height, viewport.dpr, {
      renderScale,
      maxDpr,
      maxLongSide,
    });
    syncRenderTargets(w, h);
    return () => {
      disposeRt(aReadRef.current);
      disposeRt(aWriteRef.current);
      disposeRt(bReadRef.current);
      disposeRt(bWriteRef.current);
      disposeRt(cRtRef.current);
      disposeRt(dRtRef.current);
      disposeRt(imgRtRef.current);
      aReadRef.current = null;
      aWriteRef.current = null;
      bReadRef.current = null;
      bWriteRef.current = null;
      cRtRef.current = null;
      dRtRef.current = null;
      imgRtRef.current = null;
    };
  }, [size.width, size.height, viewport.dpr, renderScale, maxDpr, maxLongSide]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      matA.dispose();
      matB.dispose();
      matC.dispose();
      matD.dispose();
      matImg.dispose();
      matUpscale.dispose();
      keyTex.dispose();
    };
  }, [geometry, matA, matB, matC, matD, matImg, matUpscale, keyTex]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = KEYCODE[e.code];
      if (k == null) return;
      keysRef.current.add(k);
      syncKeyTexture(keyTex, keysRef.current);
    };
    const onUp = (e: KeyboardEvent) => {
      const k = KEYCODE[e.code];
      if (k == null) return;
      keysRef.current.delete(k);
      syncKeyTexture(keyTex, keysRef.current);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [keyTex]);

  const setPointerPixel = useCallback(
    (clientX: number, clientY: number) => {
      const el = gl.domElement;
      const rect = el.getBoundingClientRect();
      const { fullW, fullH, w: iw, h: ih } = internalResRef.current;
      const xFull = ((clientX - rect.left) / rect.width) * fullW;
      const yFull = (1 - (clientY - rect.top) / rect.height) * fullH;
      matB.uniforms.iMouse.value.x = (xFull / fullW) * iw;
      matB.uniforms.iMouse.value.y = (yFull / fullH) * ih;
    },
    [gl.domElement, matB]
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    const aRead = aReadRef.current;
    const aWrite = aWriteRef.current;
    const bRead = bReadRef.current;
    const bWrite = bWriteRef.current;
    const cRt = cRtRef.current;
    const dRt = dRtRef.current;
    const imgRt = imgRtRef.current;
    if (!mesh || !aRead || !aWrite || !bRead || !bWrite || !cRt || !dRt || !imgRt) return;

    const { w, h, fullW, fullH } = computeUniverseInternalSize(size.width, size.height, viewport.dpr, {
      renderScale,
      maxDpr,
      maxLongSide,
    });
    internalResRef.current = { w, h, fullW, fullH };

    if (aRead.width !== w || aRead.height !== h) {
      syncRenderTargets(w, h);
      return;
    }

    const iFrame = frameRef.current;
    const dt = clock.getDelta();
    const t = state.clock.elapsedTime * timeScale;

    const res2 = matA.uniforms.iChannelResolution2.value as THREE.Vector3;
    res2.set(w, h, 1);

    matA.uniforms.iTime.value = t;
    matA.uniforms.iResolution.value.set(w, h);
    matA.uniforms.iFrame.value = iFrame;
    matA.uniforms.iChannel2.value = bRead.texture;
    matA.uniforms.iChannel3.value = aRead.texture;

    matB.uniforms.iTime.value = t;
    matB.uniforms.iTimeDelta.value = Math.max(1 / 240, Math.min(dt, 0.25));
    matB.uniforms.iResolution.value.set(w, h);
    matB.uniforms.iFrame.value = iFrame;
    matB.uniforms.iChannel0.value = aWrite.texture;
    matB.uniforms.iChannel1.value = bRead.texture;
    matB.uniforms.iMouse.value.z = pointerDownRef.current ? 1 : 0;
    if (!pointerDownRef.current) matB.uniforms.iMouse.value.w = 0;

    matC.uniforms.iResolution.value.set(w, h);
    matC.uniforms.iChannel0.value = bWrite.texture;

    matD.uniforms.iResolution.value.set(w, h);
    matD.uniforms.iChannel0.value = cRt.texture;

    matImg.uniforms.iResolution.value.set(w, h);
    matImg.uniforms.iChannel0.value = aWrite.texture;
    matImg.uniforms.iChannel3.value = dRt.texture;

    mesh.material = matA;
    gl.setRenderTarget(aWrite);
    gl.render(scene, state.camera);

    mesh.material = matB;
    gl.setRenderTarget(bWrite);
    gl.render(scene, state.camera);

    mesh.material = matC;
    gl.setRenderTarget(cRt);
    gl.render(scene, state.camera);

    mesh.material = matD;
    gl.setRenderTarget(dRt);
    gl.render(scene, state.camera);

    mesh.material = matImg;
    gl.setRenderTarget(imgRt);
    gl.render(scene, state.camera);

    mesh.material = matUpscale;
    matUpscale.uniforms.uFullRes.value.set(fullW, fullH);
    matUpscale.uniforms.uTex.value = imgRt.texture;
    gl.setRenderTarget(null);

    const tmpA = aReadRef.current;
    aReadRef.current = aWriteRef.current;
    aWriteRef.current = tmpA;

    const tmpB = bReadRef.current;
    bReadRef.current = bWriteRef.current;
    bWriteRef.current = tmpB;

    frameRef.current += 1;
  });

  return (
    <>
      <UniverseOrthographicCamera />
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={matUpscale}
        frustumCulled={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          pointerDownRef.current = true;
          matB.uniforms.iMouse.value.z = 1;
          setPointerPixel(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          pointerDownRef.current = false;
        }}
        onPointerLeave={() => {
          pointerDownRef.current = false;
        }}
        onPointerMove={(e) => {
          if (pointerDownRef.current) setPointerPixel(e.clientX, e.clientY);
        }}
      />
    </>
  );
}
