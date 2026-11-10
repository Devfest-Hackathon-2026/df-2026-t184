import { describe, expect, test } from "vitest";
import { sampleElevation, slopeMetrics } from "./elevation";
import type { ElevationGrid } from "./grid-codec";

// 10m グリッド。値は dm（0.1m）
function grid(data: number[], cols: number, rows: number): ElevationGrid {
  return { cellMeters: 10, originLat: 35.71, originLng: 139.76, cols, rows, noData: -32768, data: new Int16Array(data) };
}

function pointAt(g: ElevationGrid, xM: number, yM: number) {
  return { lat: g.originLat + yM / 111132.954, lng: g.originLng + xM / (111132.954 * Math.cos((g.originLat * Math.PI) / 180)) };
}

describe("sampleElevation（双線形補間）", () => {
  // セル中心の標高値: (0,0)=10m, (1,0)=20m, (0,1)=30m, (1,1)=40m
  const g = grid([100, 200, 300, 400], 2, 2);

  test("セル中心はそのままの値", () => {
    expect(sampleElevation(g, pointAt(g, 5, 5))).toBeCloseTo(10, 5);
  });

  test("中心間の中点は平均", () => {
    // (0,0)セル中心(5,5)と(1,0)セル中心(15,5)の中点(10,5) → 15m
    expect(sampleElevation(g, pointAt(g, 10, 5))).toBeCloseTo(15, 5);
    // (10,10)は4セルの重心 → 25m
    expect(sampleElevation(g, pointAt(g, 10, 10))).toBeCloseTo(25, 5);
  });

  test("グリッド範囲外は null", () => {
    expect(sampleElevation(g, pointAt(g, -1, 10))).toBeNull();
    expect(sampleElevation(g, pointAt(g, 10, 100))).toBeNull();
  });

  test("noData のセルに掛かる点は null", () => {
    const withHole = grid([100, -32768, 300, 400], 2, 2);
    expect(sampleElevation(withHole, pointAt(withHole, 10, 5))).toBeNull();
    // 影響しない場所は値が出る
    expect(sampleElevation(withHole, pointAt(withHole, 5, 5))).toBeCloseTo(10, 5);
  });
});

describe("slopeMetrics", () => {
  test("一様な10%斜面: 勾配は約10%、累積上昇は標高差に一致", () => {
    // 0〜90m を10m間隔: 標高 10,11,...,19m
    const xs = Array.from({ length: 10 }, (_, i) => i * 10 + 0.1);
    const distM = xs.map((_, i) => (i === 0 ? 0 : 10));
    const elevationM = xs.map((x) => 10 + x / 10);
    const r = slopeMetrics({ distM, elevationM }, { smoothingWindowSamples: 1, gradientBaselineM: 10 });
    expect(r.evaluatedLengthM).toBeCloseTo(90, 3);
    expect(r.maxGradientPct).toBeCloseTo(10, 1);
    // 平滑化なしなので累積上昇 = 19 - 10.01 ≈ 8.99
    expect(r.ascentM).toBeCloseTo(9, 1);
    expect(r.coverage).toBeCloseTo(1, 3);
  });

  test("欠損区間は評価済み長から外し、率として返す", () => {
    const distM = [0, 10, 10, 10];
    const elevationM = [10, null, 12, 13];
    const r = slopeMetrics({ distM, elevationM }, { smoothingWindowSamples: 1, gradientBaselineM: 10 });
    // 有効な連続ペアは (12->13) のみ → 評価済み10m / 全長30m
    expect(r.evaluatedLengthM).toBeCloseTo(10, 3);
    expect(r.totalLengthM).toBeCloseTo(30, 3);
    expect(r.coverage).toBeCloseTo(1 / 3, 3);
    expect(r.ascentM).toBeCloseTo(1, 3);
  });

  test("評価済み区間がゼロなら値は不明（null）", () => {
    const r = slopeMetrics({ distM: [0, 10, 10], elevationM: [null, null, null] }, { smoothingWindowSamples: 1, gradientBaselineM: 10 });
    expect(r.ascentM).toBeNull();
    expect(r.maxGradientPct).toBeNull();
    expect(r.evaluatedLengthM).toBe(0);
  });

  test("平坦なら累積上昇0・勾配0", () => {
    const r = slopeMetrics({ distM: [0, 10, 10], elevationM: [5, 5, 5] }, { smoothingWindowSamples: 1, gradientBaselineM: 10 });
    expect(r.ascentM).toBe(0);
    expect(r.maxGradientPct).toBe(0);
  });

  test("終端の短い区間（0.3m）に段差があっても勾配は基準長10m以上の区間で評価する", () => {
    // 10m 間隔で平坦に進み、最後の 0.3m で 2m 上がる（再サンプリングの端数区間 + 擁壁や DEM の段差を想定）
    const distM = [0, 10, 10, 10, 0.3];
    const elevationM = [10, 10, 10, 10, 12];
    const r = slopeMetrics({ distM, elevationM }, { smoothingWindowSamples: 1, gradientBaselineM: 10 });
    // 0.3m 単独で割ると 666% になる。直前の 10m と併せた 10.3m 区間で評価して約 19.4%
    expect(r.maxGradientPct).toBeCloseTo((2 / 10.3) * 100, 1);
    expect(r.ascentM).toBeCloseTo(2, 3);
  });

  test("基準長より短い間隔のサンプルは基準長に達するまで束ねて評価する", () => {
    // 5m 間隔・基準長 10m → 2 区間ずつ: (10→11) 10%、(11→13) 20%
    const distM = [0, 5, 5, 5, 5];
    const elevationM = [10, 10, 11, 11, 13];
    const r = slopeMetrics({ distM, elevationM }, { smoothingWindowSamples: 1, gradientBaselineM: 10 });
    expect(r.maxGradientPct).toBeCloseTo(20, 3);
  });

  test("基準長に満たない区間しか無ければ最大勾配は不明（null）、累積上昇は出す", () => {
    const r = slopeMetrics({ distM: [0, 0.3], elevationM: [10, 12] }, { smoothingWindowSamples: 1, gradientBaselineM: 10 });
    expect(r.maxGradientPct).toBeNull();
    expect(r.ascentM).toBeCloseTo(2, 3);
    expect(r.evaluatedLengthM).toBeCloseTo(0.3, 3);
  });
});
