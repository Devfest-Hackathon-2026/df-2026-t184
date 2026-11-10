import { describe, expect, test } from "vitest";
import {
  base64ToInt16,
  base64ToUint16,
  base64ToUint8,
  decodeElevationGrid,
  decodeShadeGrid,
  encodeElevationGrid,
  encodeShadeGrid,
  int16ToBase64,
  uint16ToBase64,
  uint8ToBase64,
  type ElevationGrid,
  type ShadeGrid,
} from "./grid-codec";

describe("int16/uint16/uint8 <-> base64", () => {
  test("Int16 はリトルエンディアンで往復する", () => {
    const a = new Int16Array([0, 1, -1, 256, -32768, 32767]);
    expect(base64ToInt16(int16ToBase64(a))).toEqual(a);
  });

  test("Uint16 はリトルエンディアンで往復する（bit15 も保つ）", () => {
    const a = new Uint16Array([0, 1, 256, 0x7fff, 0x8000, 0xffff]);
    expect(base64ToUint16(uint16ToBase64(a))).toEqual(a);
  });

  test("Uint8 が往復する", () => {
    const a = new Uint8Array([0, 1, 3, 255]);
    expect(base64ToUint8(uint8ToBase64(a))).toEqual(a);
  });
});

describe("grid codec", () => {
  const elevation: ElevationGrid = {
    cellMeters: 10,
    originLat: 35.71,
    originLng: 139.76,
    cols: 3,
    rows: 2,
    noData: -32768,
    data: new Int16Array([100, 110, -32768, 90, 95, 105]),
  };

  test("標高グリッドが往復する", () => {
    const json = encodeElevationGrid(elevation, "test-source");
    const back = decodeElevationGrid(json);
    expect(back).toEqual(elevation);
    expect(JSON.parse(json).source).toBe("test-source");
  });

  test("日陰グリッドが往復する", () => {
    const shade: ShadeGrid = {
      cellMeters: 10,
      originLat: 35.71,
      originLng: 139.76,
      cols: 3,
      rows: 2,
      times: [
        { label: "10:00", at: "2026-11-14T10:00:00+09:00" },
        { label: "15:00", at: "2026-11-14T15:00:00+09:00" },
      ],
      data: new Uint16Array([0, 1, 2, 3, 0x8000, 0x8001]),
    };
    const back = decodeShadeGrid(encodeShadeGrid(shade, "test-source"));
    expect(back).toEqual(shade);
  });

  test("日陰グリッドの時刻は15個まで（bit15 は評価不能に使う）", () => {
    const times = Array.from({ length: 16 }, (_, i) => ({ label: `${i}:00`, at: `2026-11-14T${String(i).padStart(2, "0")}:00:00+09:00` }));
    const shade: ShadeGrid = { cellMeters: 10, originLat: 35.71, originLng: 139.76, cols: 1, rows: 1, times, data: new Uint16Array([0]) };
    expect(() => encodeShadeGrid(shade, "test-source")).toThrow();
  });
});
