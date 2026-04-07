export type HaiSoundWorkerOutMsg =
  | { type: "progress"; p: number }
  | { type: "done"; ch0: Float32Array; ch1: Float32Array }
  | { type: "cancelled" }
  | { type: "error"; message: string };

/**
 * 在独立线程中渲染 hai 配乐 PCM，避免阻塞主线程；支持 AbortSignal 取消。
 */
export function renderHaiSoundInWorker(
  params: { durationSec: number; sampleRate: number },
  options: {
    signal?: AbortSignal;
    onProgress?: (p: number) => void;
  } = {}
): Promise<[Float32Array, Float32Array]> {
  const { durationSec, sampleRate } = params;
  const { signal, onProgress } = options;

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./haiSound.worker.ts", import.meta.url), { type: "module" });
    let settled = false;

    const finish = () => {
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      try {
        worker.postMessage({ type: "cancel" });
      } catch {
        /* ignore */
      }
      worker.terminate();
      reject(new DOMException("aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort);

    worker.onmessage = (ev: MessageEvent<HaiSoundWorkerOutMsg>) => {
      const msg = ev.data;
      if (msg.type === "progress") {
        onProgress?.(msg.p);
        return;
      }
      if (msg.type === "done") {
        if (settled) return;
        settled = true;
        finish();
        resolve([msg.ch0, msg.ch1]);
        return;
      }
      if (msg.type === "cancelled") {
        if (settled) return;
        settled = true;
        finish();
        reject(new DOMException("aborted", "AbortError"));
        return;
      }
      if (msg.type === "error") {
        if (settled) return;
        settled = true;
        finish();
        reject(new Error(msg.message));
      }
    };

    worker.onerror = (ev) => {
      if (settled) return;
      settled = true;
      finish();
      reject(new Error(ev.message || "Worker error"));
    };

    worker.postMessage({ type: "render", durationSec, sampleRate });
  });
}
