import { describe, expect, test } from "vitest";
import { decodeDemPixel, latToTileY, lngLatToPixel, lngToTileX, makeDemSampler, pixelToLngLat } from "./gsi";

describe("タイル座標", () => {
  test("上野〜谷中は z15 でタイル 29106,12898 付近", () => {
    expect(lngToTileX(139.77, 15)).toBe(29106);
    expect(latToTileY(35.72, 15)).toBe(12898);
  });

  test("画素座標と緯度経度が往復する", () => {
    const { px, py } = lngLatToPixel(139.771, 35.723, 15);
    const back = pixelToLngLat(px, py, 15);
    expect(back.lng).toBeCloseTo(139.771, 8);
    expect(back.lat).toBeCloseTo(35.723, 8);
  });
});

describe("decodeDemPixel", () => {
  test("標高は (R*65536+G*256+B)*0.01 m", () => {
    expect(decodeDemPixel(0, 0, 100)).toBeCloseTo(1, 5); // 1.00m
    expect(decodeDemPixel(0, 39, 16)).toBeCloseTo(100, 2); // 10000*0.01
  });

  test("負の標高は 2^24 引き算方式", () => {
    // -5.00m = -500 → x = 2^24 - 500
    const x = 2 ** 24 - 500;
    expect(decodeDemPixel((x >> 16) & 0xff, (x >> 8) & 0xff, x & 0xff)).toBeCloseTo(-5, 5);
  });

  test("無効値 (R=128,G=0,B=0) は null", () => {
    expect(decodeDemPixel(128, 0, 0)).toBeNull();
  });
});

describe("makeDemSampler", () => {
  test("タイルから画素中心の双線形補間をする", async () => {
    // 256x256 全部 標高10m（= 1000 → R=0,G=3,B=232）のフェイクタイル
    const data = new Uint8Array(256 * 256 * 3);
    for (let i = 0; i < 256 * 256; i++) {
      data[i * 3] = 0;
      data[i * 3 + 1] = 3;
      data[i * 3 + 2] = 232;
    }
    const tile = { width: 256, height: 256, channels: 3, data };
    const sampler = makeDemSampler(async () => tile, 15);
    const { px, py } = lngLatToPixel(139.77, 35.72, 15);
    expect(await sampler(px, py)).toBeCloseTo(10, 5);
  });

  test("無効画素に掛かると null", async () => {
    const data = new Uint8Array(256 * 256 * 3);
    data.fill(0);
    // 全域を無効値に
    for (let i = 0; i < 256 * 256; i++) {
      data[i * 3] = 128;
    }
    const tile = { width: 256, height: 256, channels: 3, data };
    const sampler = makeDemSampler(async () => tile, 15);
    const { px, py } = lngLatToPixel(139.77, 35.72, 15);
    expect(await sampler(px, py)).toBeNull();
  });
});
