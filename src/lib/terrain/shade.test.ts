import { describe, expect, test } from "vitest";
import { nearestTimeIndex, shadeStats, sampleShade } from "./shade";
import type { ShadeGrid } from "./grid-codec";

function grid(data: number[], cols: number, rows: number): ShadeGrid {
  return {
    cellMeters: 10,
    originLat: 35.71,
    originLng: 139.76,
    cols,
    rows,
    times: [{ label: "15:00", at: "2026-11-14T15:00:00+09:00" }],
    data: new Uint16Array(data),
  };
}

function pointAt(g: ShadeGrid, xM: number, yM: number) {
  return { lat: g.originLat + yM / 111132.954, lng: g.originLng + xM / (111132.954 * Math.cos((g.originLat * Math.PI) / 180)) };
}

describe("sampleShade", () => {
  const g = grid([1, 0, 0, 1], 2, 2);

  test("セル中心のビットが取れる", () => {
    expect(sampleShade(g, pointAt(g, 5, 5), 0)).toBe(true);
    expect(sampleShade(g, pointAt(g, 15, 5), 0)).toBe(false);
  });

  test("範囲外は null", () => {
    expect(sampleShade(g, pointAt(g, -5, 5), 0)).toBeNull();
  });

  test("評価不能ビット(bit15 = 0x8000)のセルは null", () => {
    const g2 = grid([0x8000, 0x8001, 0, 1], 2, 2);
    expect(sampleShade(g2, pointAt(g2, 5, 5), 0)).toBeNull();
    expect(sampleShade(g2, pointAt(g2, 15, 5), 0)).toBeNull(); // 日陰でも評価不能なら null
    expect(sampleShade(g2, pointAt(g2, 15, 15), 0)).toBe(true);
  });
});

describe("shadeStats", () => {
  const g = grid([1, 0, 0, 1], 2, 2);

  test("日陰率 = 日陰と判定した評価済み長 / 評価済み長", () => {
    // セル(0,0)=日陰 の上を10m、セル(1,0)=非日陰 の上を10m進む
    const pts = [pointAt(g, 5, 5), pointAt(g, 5, 15), pointAt(g, 15, 15), pointAt(g, 15, 5)];
    const r = shadeStats(g, pts, { distM: [0, 10, 10, 10] }, 0);
    expect(r.evaluatedLengthM).toBeCloseTo(30, 3);
    expect(r.shadedLengthM).toBeCloseTo(10, 3);
    expect(r.shadeRatio).toBeCloseTo(1 / 3, 3);
  });

  test("範囲外の点は評価済み長に入らない", () => {
    const pts = [pointAt(g, 5, 5), pointAt(g, 5, -30)];
    const r = shadeStats(g, pts, { distM: [0, 35] }, 0);
    expect(r.evaluatedLengthM).toBe(0);
    expect(r.shadeRatio).toBeNull();
    expect(r.totalLengthM).toBeCloseTo(35, 3);
  });
});

describe("nearestTimeIndex", () => {
  // 07:00〜16:00 JST の毎正時
  const times = Array.from({ length: 10 }, (_, i) => {
    const hh = String(7 + i).padStart(2, "0");
    return { label: `${hh}:00`, at: `2026-11-14T${hh}:00:00+09:00` };
  });

  test("現在時刻（JST）に最も近い時刻を選ぶ。端末のタイムゾーンに依らない", () => {
    // 10:40 JST = 01:40 UTC → 11:00
    expect(nearestTimeIndex(times, new Date("2026-11-10T01:40:00Z"))).toBe(4);
    // 10:20 JST → 10:00
    expect(nearestTimeIndex(times, new Date("2026-11-10T01:20:00Z"))).toBe(3);
  });

  test("グリッドの範囲外なら近い方の端に寄せる", () => {
    // 22:00 JST → 16:00（最後）
    expect(nearestTimeIndex(times, new Date("2026-11-10T13:00:00Z"))).toBe(9);
    // 03:00 JST → 07:00（最初）
    expect(nearestTimeIndex(times, new Date("2026-11-09T18:00:00Z"))).toBe(0);
  });
});
