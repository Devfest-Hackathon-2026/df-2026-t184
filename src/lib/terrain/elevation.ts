// 標高グリッドの参照と、経路サンプルからの坂指標の計算（純粋関数）。
// 欠損・範囲外は補完せず「評価できなかった区間」として長さだけ報告する。

import { toXY, type LatLng } from "./geo";
import type { ElevationGrid } from "./grid-codec";

// グリッド座標（セル中心基準・セル単位の浮動小数）に変換
function cellCoord(g: ElevationGrid, p: LatLng): { cx: number; cy: number } | null {
  const { x, y } = toXY(p, { lat: g.originLat, lng: g.originLng });
  return { cx: x / g.cellMeters - 0.5, cy: y / g.cellMeters - 0.5 };
}

function valueAt(g: ElevationGrid, col: number, row: number): number | null {
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return null;
  const v = g.data[row * g.cols + col];
  return v === g.noData ? null : v / 10; // dm → m
}

// 双線形補間で標高(m)を返す。範囲外・noData が絡む点は null
export function sampleElevation(g: ElevationGrid, p: LatLng): number | null {
  const c = cellCoord(g, p);
  if (!c) return null;
  const { cx, cy } = c;
  const c0 = Math.floor(cx);
  const r0 = Math.floor(cy);
  const tx = cx - c0;
  const ty = cy - r0;
  // 重みが0のセルは値を参照しない（中心ど真ん中・境界で隣の欠損に引きずられないように）
  const corners: [number, number | null][] = [
    [(1 - tx) * (1 - ty), valueAt(g, c0, r0)],
    [tx * (1 - ty), valueAt(g, c0 + 1, r0)],
    [(1 - tx) * ty, valueAt(g, c0, r0 + 1)],
    [tx * ty, valueAt(g, c0 + 1, r0 + 1)],
  ];
  let v = 0;
  for (const [w, val] of corners) {
    if (w < 1e-9) continue; // 浮動小数誤差で出る微小な重みは無視
    if (val === null) return null;
    v += w * val;
  }
  return v;
}

export type ElevationSamples = {
  distM: number[]; // distM[i] = i-1 → i の距離（distM[0] = 0）
  elevationM: (number | null)[];
};

export type SlopeMetrics = {
  totalLengthM: number; // 経路全長
  evaluatedLengthM: number; // 両端の標高が取れた区間の長さ
  coverage: number; // evaluatedLengthM / totalLengthM
  ascentM: number | null; // 累積上昇量（評価済み区間のみ）
  descentM: number | null; // 累積下降量
  maxGradientPct: number | null; // 推定最大勾配 = |標高差| / 水平距離 × 100 の最大
};

export type SlopeOptions = {
  // 移動平均の窓（サンプル数）。再現性のため固定値を呼び出し側で指定する
  smoothingWindowSamples: number;
  // 勾配を評価する水平距離の下限(m)。連続する評価済み区間をこの長さ以上になるまで束ねて勾配を取る。
  // 再サンプリングで残る短い終端区間（1m 未満のこともある）を単独で割ると勾配が跳ねるため
  gradientBaselineM: number;
};

// 移動平均。窓内の欠損は平均から外す（補完しない）。元の値が null の点は null のまま
function smooth(values: (number | null)[], windowSamples: number): (number | null)[] {
  const half = Math.floor(windowSamples / 2);
  return values.map((v, i) => {
    if (v === null) return null;
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      const u = values[j];
      if (u !== null) {
        sum += u;
        n++;
      }
    }
    return sum / n;
  });
}

// 標高が連続して取れたサンプルのまとまり [開始, 終了]（欠損をまたがない）
function evaluatedRuns(elevationM: (number | null)[]): [number, number][] {
  const runs: [number, number][] = [];
  let start: number | null = null;
  for (let i = 0; i <= elevationM.length; i++) {
    const has = i < elevationM.length && elevationM[i] !== null;
    if (has && start === null) start = i;
    if (!has && start !== null) {
      if (i - 1 > start) runs.push([start, i - 1]);
      start = null;
    }
  }
  return runs;
}

// 各まとまりの中で、区間を baselineM 以上になるまで束ねた窓ごとに |標高差| / 水平距離 を取り、その最大を返す。
// まとまりの末尾に baselineM 未満の端数が残れば直前の窓に併合する。窓が一つも取れなければ null（不明）
function maxGradientPct(distM: number[], elevationM: (number | null)[], baselineM: number): number | null {
  const gradients: number[] = [];
  const gradient = (start: number, end: number, lenM: number) => {
    gradients.push(Math.abs((((elevationM[end] as number) - (elevationM[start] as number)) / lenM) * 100));
  };
  for (const [s, e] of evaluatedRuns(elevationM)) {
    let start = s;
    let lenM = 0;
    let last: { start: number; lenM: number } | null = null;
    for (let i = s + 1; i <= e; i++) {
      lenM += distM[i];
      if (lenM > 0 && lenM >= baselineM) {
        gradient(start, i, lenM);
        last = { start, lenM };
        start = i;
        lenM = 0;
      }
    }
    if (lenM > 0 && last) gradient(last.start, e, last.lenM + lenM);
  }
  return gradients.length > 0 ? Math.max(...gradients) : null;
}

export function slopeMetrics(samples: ElevationSamples, opts: SlopeOptions): SlopeMetrics {
  const { distM, elevationM } = samples;
  const totalLengthM = distM.reduce((a, b) => a + b, 0);
  const smoothed = smooth(elevationM, opts.smoothingWindowSamples);

  let evaluatedLengthM = 0;
  let ascentM = 0;
  let descentM = 0;

  for (let i = 1; i < distM.length; i++) {
    const e0 = smoothed[i - 1];
    const e1 = smoothed[i];
    if (e0 === null || e1 === null) continue; // 欠損区間は補完せず評価対象外
    evaluatedLengthM += distM[i];
    const dh = e1 - e0;
    if (dh > 0) ascentM += dh;
    else descentM -= dh;
  }

  const hasData = evaluatedLengthM > 0;
  return {
    totalLengthM,
    evaluatedLengthM,
    coverage: totalLengthM > 0 ? evaluatedLengthM / totalLengthM : 0,
    ascentM: hasData ? ascentM : null,
    descentM: hasData ? descentM : null,
    maxGradientPct: hasData ? maxGradientPct(distM, smoothed, opts.gradientBaselineM) : null,
  };
}
