// 最小限の PNG デコーダ（非インターレース・8bit の RGB/RGBA/グレースケール）。
// 国土地理院の標高タイル（256x256 RGB8）はフィルタ 0〜4 のみで十分。

import { inflateSync } from "node:zlib";

export type DecodedPng = {
  width: number;
  height: number;
  channels: number; // 1=gray, 3=RGB, 4=RGBA
  data: Uint8Array; // RGBA/RGB/gray の画素列（行優先）
};

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 6: 4 };

export function decodePng(buf: Uint8Array): DecodedPng {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error("PNG のシグネチャが違います");
  }

  let width = 0;
  let height = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Uint8Array[] = [];

  let off = 8;
  while (off < buf.length) {
    const len = readU32(buf, off);
    const type = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7]);
    const chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = readU32(chunk, 0);
      height = readU32(chunk, 4);
      const bitDepth = chunk[8];
      colorType = chunk[9];
      interlace = chunk[12];
      if (bitDepth !== 8) throw new Error(`未対応のビット深度: ${bitDepth}`);
      if (!(colorType in CHANNELS)) throw new Error(`未対応のカラータイプ: ${colorType}`);
      if (interlace !== 0) throw new Error("インターレースは未対応");
    } else if (type === "IDAT") {
      idat.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }
  if (width === 0 || height === 0) throw new Error("IHDR がありません");

  const channels = CHANNELS[colorType];
  const raw = inflateSync(concat(idat));
  const stride = width * channels;
  const data = new Uint8Array(stride * height);

  let prev = new Uint8Array(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const out = data.subarray(y * stride, (y + 1) * stride);
    unfilter(filter, line, out, prev, channels);
    prev = out;
  }
  return { width, height, channels, data };
}

function readU32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(filter: number, line: Uint8Array, out: Uint8Array, prev: Uint8Array, bpp: number): void {
  const n = line.length;
  switch (filter) {
    case 0:
      out.set(line);
      break;
    case 1:
      for (let i = 0; i < n; i++) out[i] = (line[i] + (i >= bpp ? out[i - bpp] : 0)) & 0xff;
      break;
    case 2:
      for (let i = 0; i < n; i++) out[i] = (line[i] + prev[i]) & 0xff;
      break;
    case 3:
      for (let i = 0; i < n; i++) out[i] = (line[i] + (((i >= bpp ? out[i - bpp] : 0) + prev[i]) >> 1)) & 0xff;
      break;
    case 4:
      for (let i = 0; i < n; i++) {
        const a = i >= bpp ? out[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        out[i] = (line[i] + paeth(a, b, c)) & 0xff;
      }
      break;
    default:
      throw new Error(`未対応のフィルタ: ${filter}`);
  }
}
