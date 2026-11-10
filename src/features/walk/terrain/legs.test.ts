import { describe, expect, test } from "vitest";

import type { ElevationGrid, ShadeGrid } from "@/lib/terrain/grid-codec";

import { splitAtStops, summarizeLegs } from "./legs";
import { TerrainArea } from "./summary";

const ORIGIN = { lat: 35.71, lng: 139.76 };
const M_LAT = 111132.954;
const M_LNG = M_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180);
const at = (xM: number, yM: number) => ({ lat: ORIGIN.lat + yM / M_LAT, lng: ORIGIN.lng + xM / M_LNG });

const COLS = 40;
const ROWS = 2;
// 西の 200m は平ら、東の 200m は 1m/セルの上り。日陰は西半分だけ
const elev: ElevationGrid = {
  cellMeters: 10, originLat: ORIGIN.lat, originLng: ORIGIN.lng, cols: COLS, rows: ROWS, noData: -32768,
  data: Int16Array.from({ length: COLS * ROWS }, (_, i) => Math.max(0, (i % COLS) - 20) * 10),
};
const shade: ShadeGrid = {
  cellMeters: 10, originLat: ORIGIN.lat, originLng: ORIGIN.lng, cols: COLS, rows: ROWS,
  times: [{ label: "10:00", at: "2026-08-15T01:00:00Z" }],
  data: Uint16Array.from({ length: COLS * ROWS }, (_, i) => (i % COLS < 20 ? 1 : 0)),
};

describe("splitAtStops（寄り道ルートを地点ごとの区間に分ける）", () => {
  test("経路の点を、各地点にいちばん近い点で順に区切る", () => {
    const path = [at(0, 0), at(10, 0), at(20, 0), at(30, 0), at(40, 0)];
    const legs = splitAtStops(path, [at(0, 0), at(19, 1), at(40, 0)]);
    expect(legs).toHaveLength(2);
    expect(legs[0].at(-1)).toEqual(at(20, 0));
    expect(legs[1][0]).toEqual(at(20, 0));
  });

  test("経路が直線（地点だけ）でも区間を作る", () => {
    const stops = [at(0, 0), at(50, 0), at(100, 0)];
    expect(splitAtStops(stops, stops)).toEqual([[stops[0], stops[1]], [stops[1], stops[2]]]);
  });
});

describe("summarizeLegs（区間ごとの坂・日陰・徒歩時間）", () => {
  test("平らで日陰の区間と、上りで日向の区間を分けて出す", () => {
    const stops = [at(5, 10), at(195, 10), at(395, 10)];
    const legs = summarizeLegs(stops, stops, elev, shade);
    expect(legs).toHaveLength(2);
    const [flat, up] = legs;
    if (flat.terrain.area !== TerrainArea.Inside || up.terrain.area !== TerrainArea.Inside) throw new Error("範囲内のはず");
    expect(flat.terrain.ascentM).toBeLessThan(1);
    expect(flat.terrain.shade[0].ratio).toBeGreaterThan(0.9);
    expect(up.terrain.ascentM).toBeGreaterThan(15);
    expect(up.terrain.shade[0].ratio).toBeLessThan(0.1);
    expect(flat.minutes).toBeGreaterThanOrEqual(2);
  });
});
