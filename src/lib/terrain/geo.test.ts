import { describe, expect, test } from "vitest";
import { METERS_PER_DEG_LAT, samplePolyline, toXY } from "./geo";

describe("toXY", () => {
  const origin = { lat: 35.72, lng: 139.77 };

  test("原点は(0,0)", () => {
    expect(toXY(origin, origin)).toEqual({ x: 0, y: 0 });
  });

  test("北に0.001度で約111m", () => {
    const { y } = toXY({ lat: origin.lat + 0.001, lng: origin.lng }, origin);
    expect(y).toBeGreaterThan(110);
    expect(y).toBeLessThan(112);
  });

  test("東に0.001度で約90m（緯度35度）", () => {
    const { x } = toXY({ lat: origin.lat, lng: origin.lng + 0.001 }, origin);
    expect(x).toBeGreaterThan(89);
    expect(x).toBeLessThan(92);
  });
});

describe("samplePolyline", () => {
  const origin = { lat: 35.72, lng: 139.77 };

  test("直線100mを10m間隔で両端含め11点", () => {
    const a = origin;
    const b = toXYBack(100, 0);
    const { points } = samplePolyline([a, b], 10);
    expect(points.length).toBe(11);
    expect(points[0]).toEqual(a);
    const last = points[points.length - 1];
    expect(last.lat).toBeCloseTo(b.lat, 6);
    expect(last.lng).toBeCloseTo(b.lng, 6);
  });

  test("間隔が全長より大きいときは両端の2点", () => {
    const a = origin;
    const b = toXYBack(50, 0);
    expect(samplePolyline([a, b], 100).points.length).toBe(2);
  });

  test("折れ線では区間をまたいで間隔を保つ", () => {
    const a = origin;
    const b = toXYBack(15, 0);
    const c = toXYBack(15, 15);
    const { points } = samplePolyline([a, b, c], 10);
    // 全長30m → 10,20,30m地点+起点 = 4点
    expect(points.length).toBe(4);
    const second = toXY(points[1], origin);
    expect(second.x).toBeCloseTo(10, 5);
    const third = toXY(points[2], origin);
    expect(third.x).toBeCloseTo(15, 5);
    expect(third.y).toBeCloseTo(5, 5);
  });

  function toXYBack(x: number, y: number) {
    return {
      lat: origin.lat + y / 111132.954,
      lng: origin.lng + x / (111132.954 * Math.cos((origin.lat * Math.PI) / 180)),
    };
  }
});

describe("METERS_PER_DEG_LAT", () => {
  // WGS84 での緯度1度の長さの近似式（https://en.wikipedia.org/wiki/Latitude#Meridian_distance_on_the_ellipsoid）
  const degreeLengthM = (latDeg: number) => {
    const phi = (latDeg * Math.PI) / 180;
    return 111132.954 - 559.822 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);
  };

  test("近似式の定数項 m1 と同じ値", () => {
    expect(METERS_PER_DEG_LAT).toBe(111132.954);
  });

  test("北緯35.7度付近では近似式の値より約0.16%大きい（注記の数値の確認）", () => {
    const actual = degreeLengthM(35.721);
    expect(Math.round(actual)).toBe(110954);
    expect(((METERS_PER_DEG_LAT - actual) / actual) * 100).toBeCloseTo(0.16, 2);
    // 地区の南北 0.030度での差は約5m
    expect((35.736 - 35.706) * (METERS_PER_DEG_LAT - actual)).toBeCloseTo(5.4, 1);
  });
});
