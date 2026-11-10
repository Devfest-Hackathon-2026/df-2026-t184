import { describe, expect, test } from "vitest";
import { solarPosition } from "./sun";

// 上野〜谷中あたり
const LAT = 35.72;
const LNG = 139.77;

describe("solarPosition", () => {
  test("夏至近くの正午は南中（高度が高く方位は南）", () => {
    // 2026-06-21 12:00 JST = 03:00 UTC
    const p = solarPosition(new Date("2026-06-21T03:00:00Z"), LAT, LNG);
    expect(p).not.toBeNull();
    expect(p!.altitudeDeg).toBeGreaterThan(70);
    expect(p!.altitudeDeg).toBeLessThan(80);
    expect(p!.azimuthDeg).toBeGreaterThan(160);
    expect(p!.azimuthDeg).toBeLessThan(200);
  });

  test("8月15日15時(JST)は西に傾いた太陽", () => {
    // 15:00 JST = 06:00 UTC
    const p = solarPosition(new Date("2026-08-15T06:00:00Z"), LAT, LNG);
    expect(p).not.toBeNull();
    expect(p!.altitudeDeg).toBeGreaterThan(40);
    expect(p!.altitudeDeg).toBeLessThan(55);
    expect(p!.azimuthDeg).toBeGreaterThan(240);
    expect(p!.azimuthDeg).toBeLessThan(265);
  });

  test("8月15日10時(JST)は東寄りの太陽", () => {
    const p = solarPosition(new Date("2026-08-15T01:00:00Z"), LAT, LNG);
    expect(p).not.toBeNull();
    expect(p!.altitudeDeg).toBeGreaterThan(45);
    expect(p!.azimuthDeg).toBeGreaterThan(105);
    expect(p!.azimuthDeg).toBeLessThan(140);
  });

  test("深夜は null（夜間は出さない）", () => {
    // 00:00 JST = 前日15:00 UTC
    expect(solarPosition(new Date("2026-08-14T15:00:00Z"), LAT, LNG)).toBeNull();
  });
});
