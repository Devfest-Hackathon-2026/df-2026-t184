import { describe, expect, test } from "vitest";

import type { ElevationGrid, ShadeGrid } from "@/lib/terrain/grid-codec";

import { summarizeTerrain, TerrainArea } from "./summary";

const ORIGIN = { lat: 35.71, lng: 139.76 };
const M_LAT = 111132.954;
const M_LNG = M_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180);
const at = (xM: number, yM: number) => ({ lat: ORIGIN.lat + yM / M_LAT, lng: ORIGIN.lng + xM / M_LNG });

// 東西 200m × 南北 20m、10m セル。標高は東へ 1m/セルずつ上がる（10% の上り）
const COLS = 20;
const ROWS = 2;
const elev: ElevationGrid = {
  cellMeters: 10,
  originLat: ORIGIN.lat,
  originLng: ORIGIN.lng,
  cols: COLS,
  rows: ROWS,
  noData: -32768,
  data: Int16Array.from({ length: COLS * ROWS }, (_, i) => (i % COLS) * 10),
};
// 西半分は 10:00 に日陰（bit0）、15:00（bit1）は全部日向
const shade: ShadeGrid = {
  cellMeters: 10,
  originLat: ORIGIN.lat,
  originLng: ORIGIN.lng,
  cols: COLS,
  rows: ROWS,
  times: [
    { label: "10:00", at: "2026-08-15T01:00:00Z" },
    { label: "15:00", at: "2026-08-15T06:00:00Z" },
  ],
  data: Uint16Array.from({ length: COLS * ROWS }, (_, i) => (i % COLS < COLS / 2 ? 1 : 0)),
};

describe("summarizeTerrain（ルートの坂・日陰の推定）", () => {
  test("データの範囲内なら、上りの合計・最大勾配・時刻ごとの日陰の割合を出す", () => {
    const r = summarizeTerrain([at(5, 10), at(195, 10)], elev, shade);
    expect(r.area).toBe(TerrainArea.Inside);
    if (r.area !== TerrainArea.Inside) return;
    expect(r.ascentM).toBeGreaterThan(15);
    expect(r.maxGradientPct).toBeCloseTo(10, 0);
    expect(r.shade.map((s) => s.label)).toEqual(["10:00", "15:00"]);
    expect(r.shade[0].ratio).toBeGreaterThan(0.4);
    expect(r.shade[0].ratio).toBeLessThan(0.6);
    expect(r.shade[1].ratio).toBe(0);
  });

  test("ルートの大半がデータの範囲外なら、値を出さずに「対象外」とする（欠けたデータで判定しない）", () => {
    const r = summarizeTerrain([at(5, 10), at(5000, 10)], elev, shade);
    expect(r.area).toBe(TerrainArea.Outside);
  });

  test("点が 2 つ未満なら対象外", () => {
    expect(summarizeTerrain([at(5, 10)], elev, shade).area).toBe(TerrainArea.Outside);
  });
});
