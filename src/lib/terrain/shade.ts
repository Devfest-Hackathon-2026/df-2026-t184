// 日陰グリッドの参照と、経路サンプルからの日陰率の計算（純粋関数）。
// 日陰率 = 日陰と判定した評価済み長 / 評価済み長。範囲外は評価済みに含めない。

import { toXY, type LatLng } from "./geo";
import { SHADE_UNEVALUABLE, type ShadeGrid } from "./grid-codec";

// サンプル点が含まれるセルのビットを返す。範囲外・評価不能セル（bit15）は null
export function sampleShade(g: ShadeGrid, p: LatLng, timeIndex: number): boolean | null {
  const { x, y } = toXY(p, { lat: g.originLat, lng: g.originLng });
  const col = Math.floor(x / g.cellMeters);
  const row = Math.floor(y / g.cellMeters);
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return null;
  const bits = g.data[row * g.cols + col];
  if (bits & SHADE_UNEVALUABLE) return null;
  return (bits & (1 << timeIndex)) !== 0;
}

// JST の時刻（時 + 分/60）。端末のタイムゾーンに依らず UTC から求める
function jstHour(d: Date): number {
  return ((d.getUTCHours() + 9) % 24) + d.getUTCMinutes() / 60;
}

// now（JST）に最も近い評価時刻の index。グリッドの時刻範囲の外なら近い方の端になる
export function nearestTimeIndex(times: ShadeGrid["times"], now: Date): number {
  const target = jstHour(now);
  const distance = (t: ShadeGrid["times"][number]) => Math.abs(jstHour(new Date(t.at)) - target);
  return times.reduce((best, t, i) => (distance(t) < distance(times[best]) ? i : best), 0);
}

export type ShadeStats = {
  totalLengthM: number;
  evaluatedLengthM: number;
  shadedLengthM: number;
  coverage: number; // evaluatedLengthM / totalLengthM
  shadeRatio: number | null; // shadedLengthM / evaluatedLengthM。評価済みゼロなら null（不明）
};

// 区間 i-1 → i の日陰判定は点 i の値で代表する（サンプル間隔がセルと同程度の前提）
export function shadeStats(g: ShadeGrid, points: LatLng[], opts: { distM: number[] }, timeIndex: number): ShadeStats {
  const { distM } = opts;
  const totalLengthM = distM.reduce((a, b) => a + b, 0);
  let evaluatedLengthM = 0;
  let shadedLengthM = 0;

  for (let i = 1; i < points.length; i++) {
    const s = sampleShade(g, points[i], timeIndex);
    if (s === null) continue;
    evaluatedLengthM += distM[i];
    if (s) shadedLengthM += distM[i];
  }

  return {
    totalLengthM,
    evaluatedLengthM,
    shadedLengthM,
    coverage: totalLengthM > 0 ? evaluatedLengthM / totalLengthM : 0,
    shadeRatio: evaluatedLengthM > 0 ? shadedLengthM / evaluatedLengthM : null,
  };
}
