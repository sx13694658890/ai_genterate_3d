import { useFrame, useThree } from "@react-three/fiber";
import { button, monitor, useControls } from "leva";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildHaiFragmentShader, haiVertexShader } from "@/three/shader/hai/buildHaiShader";
import { createHaiSoundAudioBuffer } from "@/three/shader/hai/haiSoundAudio";
import { createHaiNoiseTexture } from "@/three/shader/hai/noiseTexture";
import { useHaiBoot } from "./haiBootContext";

const SCENE_AFTER_AUDIO_MS = 420;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type AudioRefState = {
  ctx: AudioContext | null;
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gain: GainNode | null;
  abort: AbortController | null;
  busy: boolean;
};

function playHaiLoop(a: AudioRefState, volume: number, stopFirst: () => void): void {
  if (!a.ctx || !a.buffer) return;
  stopFirst();
  const src = a.ctx.createBufferSource();
  src.buffer = a.buffer;
  src.loop = true;
  const gain = a.ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(a.ctx.destination);
  src.start(0);
  a.source = src;
  a.gain = gain;
}

function HaiOrthographicCamera() {
  const { set } = useThree();
  useLayoutEffect(() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    cam.position.set(0, 0, 1);
    cam.updateProjectionMatrix();
    set({ camera: cam });
  }, [set]);
  return null;
}

/**
 * 画面：hai.glsl。启动层在 Canvas 外（MainLayout + HaiBootOverlayDom），避免 Html 缩放异常。
 * 离开本案例时 Provider 卸载，abort 会立即 terminate Web Worker。
 */
export function HaiScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport, clock } = useThree();
  const { ui, setUi, registerBootHandlers } = useHaiBoot();

  const { timeScale } = useControls("海盗夜景 (hai.glsl)", {
    timeScale: { value: 1, min: 0, max: 2, step: 0.05 },
  });

  const soundUiRef = useRef({ sampleRate: 22050, volume: 0.65 });
  const iTime0Ref = useRef(0);
  const bootRunIdRef = useRef(0);
  const audioRef = useRef<AudioRefState>({
    ctx: null,
    buffer: null,
    source: null,
    gain: null,
    abort: null,
    busy: false,
  });

  const stopHaiSound = useCallback(() => {
    const a = audioRef.current;
    if (a.source) {
      try {
        a.source.stop();
      } catch {
        /* already stopped */
      }
      a.source.disconnect();
      a.source = null;
    }
    if (a.gain) {
      a.gain.disconnect();
      a.gain = null;
    }
  }, []);

  const runBootSequence = useCallback(async () => {
    const runId = ++bootRunIdRef.current;
    const a = audioRef.current;
    a.abort?.abort();
    const ac = new AbortController();
    a.abort = ac;

    setUi((s) => ({
      ...s,
      bootMode: "busy",
      bootError: null,
      bootHint: "正在合成配乐…",
      genProgress: null,
    }));

    try {
      if (!a.ctx) a.ctx = new AudioContext();
      await a.ctx.resume();

      if (runId !== bootRunIdRef.current) return;

      if (!a.buffer) {
        a.busy = true;
        setUi((s) => ({ ...s, genProgress: 0 }));
        const buf = await createHaiSoundAudioBuffer(a.ctx, {
          durationSec: 60,
          sampleRate: soundUiRef.current.sampleRate,
          signal: ac.signal,
          onProgress: (p) => {
            if (runId === bootRunIdRef.current) setUi((s) => ({ ...s, genProgress: p }));
          },
          useWorker: true,
        });
        if (runId !== bootRunIdRef.current) return;
        a.buffer = buf;
        a.busy = false;
        setUi((s) => ({ ...s, genProgress: null }));
      }

      if (runId !== bootRunIdRef.current) return;
      setUi((s) => ({ ...s, bootHint: "即将显示画面…" }));
      playHaiLoop(a, soundUiRef.current.volume, stopHaiSound);

      await sleep(SCENE_AFTER_AUDIO_MS);
      if (runId !== bootRunIdRef.current) return;
      setUi((s) => ({ ...s, showScene: true }));
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      console.error(e);
      if (runId !== bootRunIdRef.current) return;
      setUi((s) => ({
        ...s,
        bootError: e instanceof Error ? e.message : "配乐生成失败",
        bootMode: "error",
        genProgress: null,
      }));
      a.busy = false;
    }
  }, [setUi, stopHaiSound]);

  const handleBootRetry = useCallback(() => {
    setUi((s) => ({
      ...s,
      bootMode: "tap",
      bootError: null,
      genProgress: null,
    }));
  }, [setUi]);

  useLayoutEffect(() => {
    registerBootHandlers({
      onStart: () => void runBootSequence(),
      onRetry: handleBootRetry,
    });
    return () => {
      registerBootHandlers({ onStart: () => {}, onRetry: () => {} });
    };
  }, [registerBootHandlers, runBootSequence, handleBootRetry]);

  const { haiVolume } = useControls("海盗配乐 (sound.glsl)", {
    haiSampleRate: {
      label: "采样率",
      value: 22050,
      options: [22050, 44100, 48000],
      onChange: (v) => {
        soundUiRef.current.sampleRate = v;
      },
    },
    haiVolume: {
      label: "音量",
      value: 0.65,
      min: 0,
      max: 1,
      step: 0.02,
      onChange: (v) => {
        soundUiRef.current.volume = v;
      },
    },
    生成进度: monitor(() =>
      ui.genProgress === null
        ? audioRef.current.buffer
          ? "已缓存 60s"
          : "未生成"
        : `${Math.round(ui.genProgress * 100)}%`
    ),
    生成60秒音频: button(() => {
      void (async () => {
        const a = audioRef.current;
        if (a.busy) return;
        a.busy = true;
        a.abort?.abort();
        a.abort = new AbortController();
        stopHaiSound();
        a.buffer = null;
        const rate = soundUiRef.current.sampleRate;
        try {
          if (!a.ctx) a.ctx = new AudioContext();
          await a.ctx.resume();
          setUi((s) => ({ ...s, genProgress: 0 }));
          const buf = await createHaiSoundAudioBuffer(a.ctx, {
            durationSec: 60,
            sampleRate: rate,
            signal: a.abort.signal,
            onProgress: (p) => setUi((s) => ({ ...s, genProgress: p })),
            useWorker: true,
          });
          a.buffer = buf;
        } catch (e) {
          if ((e as DOMException).name !== "AbortError") console.error(e);
        } finally {
          a.busy = false;
          setUi((s) => ({ ...s, genProgress: null }));
        }
      })();
    }),
    播放循环: button(() => {
      void (async () => {
        const a = audioRef.current;
        if (!a.ctx) a.ctx = new AudioContext();
        await a.ctx.resume();
        if (!a.buffer) {
          a.busy = true;
          try {
            setUi((s) => ({ ...s, genProgress: 0 }));
            const buf = await createHaiSoundAudioBuffer(a.ctx, {
              durationSec: 60,
              sampleRate: soundUiRef.current.sampleRate,
              onProgress: (p) => setUi((s) => ({ ...s, genProgress: p })),
              useWorker: true,
            });
            a.buffer = buf;
          } catch (e) {
            console.error(e);
            a.busy = false;
            setUi((s) => ({ ...s, genProgress: null }));
            return;
          }
          a.busy = false;
          setUi((s) => ({ ...s, genProgress: null }));
        }
        playHaiLoop(a, soundUiRef.current.volume, stopHaiSound);
      })();
    }),
    停止声音: button(() => {
      stopHaiSound();
    }),
  }) as { haiVolume: number };

  useEffect(() => {
    const g = audioRef.current.gain;
    const ctx = audioRef.current.ctx;
    if (g && ctx) g.gain.setTargetAtTime(haiVolume, ctx.currentTime, 0.02);
  }, [haiVolume]);

  useLayoutEffect(() => {
    if (ui.showScene) iTime0Ref.current = clock.elapsedTime;
  }, [ui.showScene, clock]);

  useEffect(() => {
    return () => {
      bootRunIdRef.current += 1;
      audioRef.current.abort?.abort();
      stopHaiSound();
      void audioRef.current.ctx?.close();
      audioRef.current.ctx = null;
      audioRef.current.buffer = null;
    };
  }, [stopHaiSound]);

  const channel0 = useMemo(() => createHaiNoiseTexture(0x9e3779b9), []);
  const channel1 = useMemo(() => createHaiNoiseTexture(0x517cc1b7), []);

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: haiVertexShader,
      fragmentShader: buildHaiFragmentShader(),
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1, 1) },
        iChannel0: { value: channel0 },
        iChannel1: { value: channel1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    return m;
  }, [channel0, channel1]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      channel0.dispose();
      channel1.dispose();
    };
  }, [geometry, material, channel0, channel1]);

  useFrame((state) => {
    const m = meshRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!m || !ui.showScene) return;
    m.uniforms.iTime.value = (state.clock.elapsedTime - iTime0Ref.current) * timeScale;
    m.uniforms.iResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
  });

  return (
    <>
      <HaiOrthographicCamera />
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        frustumCulled={false}
        visible={ui.showScene}
      />
    </>
  );
}
