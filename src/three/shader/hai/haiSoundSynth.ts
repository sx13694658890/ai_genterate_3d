/**
 * 与 sound.glsl 等价的程序化合成（instrument / doChannel1 / doChannel2 / mainSound）。
 * 用于 Web Audio 离线路径渲染；逻辑与 GLSL 保持一致以便听感一致。
 */

const TAU = 6.283185;

export function instrument(freq: number, time: number): number {
  let ph = 1.0;
  ph *= Math.sin(TAU * freq * time * 2.0);
  ph *= 0.5 + 0.5 * Math.max(0.0, 5.0 - 0.01 * freq);
  ph *= Math.exp(-time * freq * 0.2);

  let y = 0.0;
  y += 0.7 * Math.sin(1.0 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.007 * freq * time);
  y += 0.2 * Math.sin(2.01 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.011 * freq * time);
  y += 0.2 * Math.sin(3.01 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.015 * freq * time);
  y += 0.16 * Math.sin(4.01 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.018 * freq * time);
  y += 0.13 * Math.sin(5.01 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.021 * freq * time);
  y += 0.1 * Math.sin(6.01 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.027 * freq * time);
  y += 0.09 * Math.sin(8.01 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.03 * freq * time);
  y += 0.07 * Math.sin(9.01 * TAU * freq * time + ph) * Math.pow(2, -0.7 * 0.033 * freq * time);

  y += 0.35 * y * y * y;
  y += 0.1 * y * y * y;

  y *= 1.0 + 1.5 * Math.exp(-8.0 * time);
  y *= Math.min(1, Math.max(0, time / 0.004));

  y *= 2.5 - 1.5 * Math.min(1, Math.max(0, Math.log2(freq) / 10.0));
  return y;
}

/** 对应 #define D(a) b+=float(a);if(t>b)x=b; */
function runD(t: number, deltas: readonly number[]): number {
  let x = t;
  let b = 0;
  for (let i = 0; i < deltas.length; i++) {
    b += deltas[i]!;
    if (t > b) x = b;
  }
  return x;
}

function addNote(y: number, tScaled: number, deltas: readonly number[], freq: number, tint: number): number {
  const x = runD(tScaled, deltas);
  return y + instrument(freq, tint * (tScaled - x));
}

const TINT = 0.144;

export function doChannel1(tSec: number): number {
  const t = tSec / TINT;
  let y = 0;
  y = addNote(y, t, [36, 2, 2, 20, 2, 16, 6, 2, 226], 174.0, TINT);
  y = addNote(y, t, [53, 208], 195.0, TINT);
  y = addNote(
    y,
    t,
    [
      34, 2, 2, 2, 1, 7, 2, 2, 2, 1, 3, 8, 2, 8, 2, 4, 2, 2, 2, 1, 31, 2, 4, 138, 46, 2,
    ],
    220.0,
    TINT
  );
  y = addNote(y, t, [42, 2, 2, 14, 2, 2, 1, 25, 2, 16, 2, 2], 233.0, TINT);
  y = addNote(y, t, [125], 246.0, TINT);
  y = addNote(y, t, [35, 6, 7, 2, 3, 1, 5, 7, 2, 2, 1, 1, 2, 3, 6, 199, 2, 2, 2, 1], 261.0, TINT);
  y = addNote(y, t, [120, 2, 4, 132, 1, 5, 42, 2], 277.0, TINT);
  y = addNote(
    y,
    t,
    [
      0, 2, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 3, 2, 2, 2, 2, 2, 1, 5, 3, 5, 2,
      2, 12, 2, 6, 2, 2, 2, 2, 2, 1, 1, 2, 5, 3, 2, 2, 2, 3, 3, 6, 1, 136, 9, 2, 2, 2, 1, 17, 2, 2, 2, 1, 11,
    ],
    293.0,
    TINT
  );
  y = addNote(y, t, [41, 7, 2, 15, 7, 2, 27, 6, 13, 2, 4, 132, 1, 23, 2, 2, 2, 18, 4], 329.0, TINT);
  y = addNote(
    y,
    t,
    [
      42, 2, 2, 20, 2, 2, 19, 11, 2, 6, 2, 4, 5, 5, 8, 2, 2, 20, 2, 16, 6, 2, 82, 4, 2, 2, 2, 2, 1, 12, 5, 2, 2,
      2, 1, 7,
    ],
    349.0,
    TINT
  );
  y = addNote(y, t, [47, 24, 19, 2, 2, 2, 2, 3, 11, 37, 120, 13, 2, 2, 2, 18], 391.0, TINT);
  y = addNote(
    y,
    t,
    [
      95, 5, 2, 12, 16, 2, 2, 2, 1, 7, 2, 2, 2, 1, 3, 8, 2, 8, 2, 4, 2, 2, 2, 1, 31, 2, 4, 2, 2, 12, 1, 1, 30, 2,
      2, 3, 12, 5, 2, 2, 3,
    ],
    440.0,
    TINT
  );
  y = addNote(
    y,
    t,
    [96, 2, 40, 2, 2, 14, 2, 2, 1, 25, 2, 16, 2, 2, 24, 18, 1, 1, 24, 24],
    466.0,
    TINT
  );
  y = addNote(y, t, [131, 6, 7, 2, 3, 1, 5, 7, 2, 2, 1, 1, 2, 3, 6, 47, 2], 523.0, TINT);
  y = addNote(y, t, [216, 2, 3], 554.0, TINT);
  y = addNote(
    y,
    t,
    [
      132, 2, 2, 2, 2, 2, 1, 5, 3, 5, 2, 2, 12, 2, 6, 2, 2, 2, 2, 2, 1, 1, 2, 5, 3, 2, 2, 2, 3, 3, 6, 2, 2, 4, 4,
      2, 5, 7, 5,
    ],
    587.0,
    TINT
  );
  y = addNote(y, t, [137, 7, 2, 15, 7, 2, 27, 6, 13, 2, 8], 659.0, TINT);
  y = addNote(y, t, [138, 2, 2, 20, 2, 2, 19, 11, 2, 6, 2, 4, 5, 13, 2, 1, 4, 3], 698.0, TINT);
  y = addNote(y, t, [143, 24, 19, 2, 2, 2, 2, 3, 11, 24, 14, 4], 783.0, TINT);
  y = addNote(y, t, [191, 5, 2, 12, 24], 880.0, TINT);
  y = addNote(y, t, [192, 2, 52], 932.0, TINT);
  y += instrument(1046.0, TINT * (t - t));
  return y;
}

export function doChannel2(tSec: number): number {
  const t = tSec / TINT;
  let y = 0;
  y = addNote(y, t, [24, 6, 3], 36.0, TINT);
  y = addNote(y, t, [66, 2, 1, 2, 91, 2, 1, 2], 43.0, TINT);
  y = addNote(y, t, [96, 2, 1, 2, 91, 2, 1, 2, 49, 2, 1, 2, 1, 2, 1, 2], 48.0, TINT);
  y = addNote(
    y,
    t,
    [
      48, 2, 1, 2, 22, 2, 43, 2, 1, 2, 1, 2, 1, 2, 13, 2, 1, 2, 22, 2, 43, 2, 1, 2, 13, 2, 1, 2, 1, 2, 1, 2, 13,
      2, 1, 2, 1, 2, 1, 2, 37, 2, 1, 2,
    ],
    55.0,
    TINT
  );
  y = addNote(
    y,
    t,
    [
      42, 2, 1, 2, 13, 2, 1, 2, 25, 2, 1, 2, 13, 2, 1, 2, 25, 2, 1, 2, 13, 2, 1, 2, 25, 2, 1, 2, 13, 2, 1, 2, 23,
    ],
    58.0,
    TINT
  );
  y = addNote(y, t, [41, 31, 2, 63, 31, 2, 56, 2, 2, 52, 2, 1, 2], 65.0, TINT);
  y = addNote(
    y,
    t,
    [
      24, 6, 3, 3, 2, 1, 15, 2, 1, 2, 19, 2, 1, 2, 1, 2, 1, 2, 13, 2, 1, 2, 7, 2, 1, 2, 13, 2, 1, 15, 2, 1, 2, 19,
      2, 1, 2, 1, 2, 1, 2, 13, 2, 1, 2, 7, 2, 1, 2, 7, 2, 46, 2, 1, 2, 1, 2, 1, 1, 1, 13, 2, 1, 2, 1, 2, 1, 1, 1, 7,
    ],
    73.0,
    TINT
  );
  y = addNote(y, t, [66, 2, 1, 2, 91, 2, 1, 2, 121, 2, 1, 1, 1], 87.0, TINT);
  y = addNote(y, t, [96, 2, 1, 2, 91, 2, 1, 2, 49, 2, 1, 2, 1, 2, 1, 2], 97.0, TINT);
  y = addNote(
    y,
    t,
    [
      48, 2, 1, 2, 22, 2, 43, 2, 1, 2, 1, 2, 1, 2, 13, 2, 1, 2, 22, 2, 43, 2, 1, 2, 13, 2, 1, 2, 1, 2, 1, 2, 13,
      2, 1, 2, 1, 2, 1, 2, 37, 2, 1, 2,
    ],
    110.0,
    TINT
  );
  y = addNote(
    y,
    t,
    [
      42, 2, 1, 2, 13, 2, 1, 2, 25, 2, 1, 2, 13, 2, 1, 2, 25, 2, 1, 2, 13, 2, 1, 2, 25, 2, 1, 2, 13, 2, 1, 2, 23,
    ],
    116.0,
    TINT
  );
  y = addNote(y, t, [41, 31, 2, 63, 31, 2, 56, 2, 2, 52, 2, 1, 2], 130.0, TINT);
  y = addNote(
    y,
    t,
    [
      36, 2, 1, 15, 2, 1, 2, 19, 2, 1, 2, 1, 2, 1, 2, 13, 2, 1, 2, 7, 2, 1, 2, 13, 2, 1, 15, 2, 1, 2, 19, 2, 1, 2,
      1, 2, 1, 2, 13, 2, 1, 2, 7, 2, 1, 2, 7, 2, 46, 2, 1, 2, 1, 2, 1, 1, 1, 13, 2, 1, 2, 1, 2, 1, 1, 1, 7,
    ],
    146.0,
    TINT
  );
  y = addNote(y, t, [288, 2, 1, 1, 1], 174.0, TINT);
  return y;
}

export function mainSoundStereo(timeSec: number): [number, number] {
  const time = timeSec % 60.0;
  const c1 = doChannel1(time);
  const c2 = doChannel2(time);
  const gain = 0.1;
  const l = (0.7 * c1 + 0.3 * c2) * gain;
  const r = (0.3 * c1 + 0.7 * c2) * gain;
  return [l, r];
}

export function renderHaiSoundOffline(
  durationSec: number,
  sampleRate: number,
  onProgress?: (p: number) => void
): Float32Array[] {
  const n = Math.floor(durationSec * sampleRate);
  const ch0 = new Float32Array(n);
  const ch1 = new Float32Array(n);
  const chunk = 4096;
  for (let i = 0; i < n; i += chunk) {
    const end = Math.min(i + chunk, n);
    for (let s = i; s < end; s++) {
      const t = s / sampleRate;
      const [l, r] = mainSoundStereo(t);
      ch0[s] = l;
      ch1[s] = r;
    }
    if (onProgress) onProgress(end / n);
  }
  return [ch0, ch1];
}
