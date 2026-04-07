import { mainSoundStereo, renderHaiSoundOffline } from "./haiSoundSynth";
import { renderHaiSoundInWorker } from "./haiSoundWorkerClient";

function peakNormalize(channels: readonly Float32Array[], targetPeak = 0.92): void {
  let m = 1e-12;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]!);
      if (a > m) m = a;
    }
  }
  const g = targetPeak / m;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) ch[i]! *= g;
  }
}

/**
 * 主线程分块渲染（无 Worker 时的回退）；会穿插 setTimeout 让出事件循环。
 */
export async function fillHaiSoundBuffer(
  channels: [Float32Array, Float32Array],
  sampleRate: number,
  signal: AbortSignal | undefined,
  onProgress: ((p: number) => void) | undefined
): Promise<void> {
  const n = channels[0]!.length;
  const chunk = 2048;
  for (let i = 0; i < n; i += chunk) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const end = Math.min(i + chunk, n);
    for (let s = i; s < end; s++) {
      const t = s / sampleRate;
      const [l, r] = mainSoundStereo(t);
      channels[0]![s] = l;
      channels[1]![s] = r;
    }
    onProgress?.(end / n);
    await new Promise<void>((r) => setTimeout(r, 0));
  }
}

export async function createHaiSoundAudioBuffer(
  audioContext: AudioContext,
  options: {
    durationSec?: number;
    sampleRate?: number;
    signal?: AbortSignal;
    onProgress?: (p: number) => void;
    /** 默认 true：在 Worker 中合成，不阻塞主线程（Worker 内已做峰值归一化） */
    useWorker?: boolean;
    normalize?: boolean;
  } = {}
): Promise<AudioBuffer> {
  const durationSec = options.durationSec ?? 60;
  const sampleRate = options.sampleRate ?? audioContext.sampleRate;
  const useWorker = options.useWorker !== false;

  let ch0: Float32Array;
  let ch1: Float32Array;

  if (useWorker) {
    [ch0, ch1] = await renderHaiSoundInWorker(
      { durationSec, sampleRate },
      { signal: options.signal, onProgress: options.onProgress }
    );
  } else {
    const n = Math.floor(durationSec * sampleRate);
    ch0 = new Float32Array(n);
    ch1 = new Float32Array(n);
    await fillHaiSoundBuffer([ch0, ch1], sampleRate, options.signal, options.onProgress);
    if (options.normalize !== false) peakNormalize([ch0, ch1]);
  }

  const buf = audioContext.createBuffer(2, ch0.length, sampleRate);
  buf.getChannelData(0).set(ch0);
  buf.getChannelData(1).set(ch1);
  return buf;
}

/** 同步版本（测试用）；主线程长时间阻塞。 */
export function createHaiSoundAudioBufferSync(
  audioContext: AudioContext,
  durationSec = 60,
  sampleRate?: number
): AudioBuffer {
  const rate = sampleRate ?? audioContext.sampleRate;
  const [c0, c1] = renderHaiSoundOffline(durationSec, rate);
  const buf = audioContext.createBuffer(2, c0.length, rate);
  buf.getChannelData(0).set(c0);
  buf.getChannelData(1).set(c1);
  peakNormalize([buf.getChannelData(0), buf.getChannelData(1)]);
  return buf;
}
