/// <reference lib="webworker" />

import { mainSoundStereo } from "./haiSoundSynth";

type InMsg = { type: "render"; durationSec: number; sampleRate: number } | { type: "cancel" };

let cancelled = false;

function peakNormalizePair(ch0: Float32Array, ch1: Float32Array, targetPeak = 0.92): void {
  let m = 1e-12;
  for (let i = 0; i < ch0.length; i++) {
    m = Math.max(m, Math.abs(ch0[i]!), Math.abs(ch1[i]!));
  }
  const g = targetPeak / m;
  for (let i = 0; i < ch0.length; i++) {
    ch0[i]! *= g;
    ch1[i]! *= g;
  }
}

self.onmessage = (e: MessageEvent<InMsg>) => {
  const d = e.data;
  if (d.type === "cancel") {
    cancelled = true;
    return;
  }
  if (d.type !== "render") return;

  cancelled = false;
  const { durationSec, sampleRate } = d;
  const n = Math.floor(durationSec * sampleRate);
  const ch0 = new Float32Array(n);
  const ch1 = new Float32Array(n);
  const chunk = 8192;

  try {
    for (let i = 0; i < n; i += chunk) {
      if (cancelled) {
        postMessage({ type: "cancelled" });
        return;
      }
      const end = Math.min(i + chunk, n);
      for (let s = i; s < end; s++) {
        const t = s / sampleRate;
        const [l, r] = mainSoundStereo(t);
        ch0[s] = l;
        ch1[s] = r;
      }
      postMessage({ type: "progress", p: end / n });
    }
    peakNormalizePair(ch0, ch1);
    postMessage({ type: "done", ch0, ch1 }, [ch0.buffer, ch1.buffer]);
  } catch (err) {
    postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
