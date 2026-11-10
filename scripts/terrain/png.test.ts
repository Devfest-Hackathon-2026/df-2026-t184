import { deflateSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { decodePng } from "./png";

// CRC32（PNG チャンク用・テスト内で PNG を組み立てるための最小実装）
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

// フィルタ0のRGB PNG を組み立てる
function makeRgbPng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    raw.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

describe("decodePng", () => {
  test("2x2 RGB（フィルタ0）を復元する", () => {
    const px = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 10, 20, 30]);
    const png = decodePng(makeRgbPng(2, 2, px));
    expect(png.width).toBe(2);
    expect(png.height).toBe(2);
    expect(png.channels).toBe(3);
    expect(Array.from(png.data)).toEqual(Array.from(px));
  });

  test("壊れたデータはエラー", () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
