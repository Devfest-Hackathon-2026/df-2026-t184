// 国土地理院の標高タイル（dem5a_png 等）のタイル計算と画素の標高変換。
// タイル仕様（投影・ズームレベル・タイル座標）: https://maps.gsi.go.jp/development/siyou.html
// 標高 PNG の画素値の換算式・無効値・分解能 0.01m: https://maps.gsi.go.jp/development/demtile.html
// - Web メルカトル XYZ タイル、1画素 = 標高を R*2^16+G*2^8+B に符号化
// - 値 x: x == 2^23 なら無効、x < 2^23 なら h = x*0.01m、x > 2^23 なら h = (x-2^24)*0.01m

import type { DecodedPng } from "./png.ts";

export const TILE_SIZE = 256;
export const DEM_LAYER = "dem5a_png";
export const DEM_ZOOM = 15;

export function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** z);
}

export function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

// 緯度経度 → ズーム z のグローバル画素座標（小数）
export function lngLatToPixel(lng: number, lat: number, z: number): { px: number; py: number } {
  const rad = (lat * Math.PI) / 180;
  const n = 2 ** z * TILE_SIZE;
  return {
    px: ((lng + 180) / 360) * n,
    py: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
}

export function pixelToLngLat(px: number, py: number, z: number): { lng: number; lat: number } {
  const n = 2 ** z * TILE_SIZE;
  const lng = (px / n) * 360 - 180;
  const t = Math.PI * (1 - (2 * py) / n);
  const lat = (Math.atan(Math.sinh(t)) * 180) / Math.PI;
  return { lng, lat };
}

// PNG 画素値 → 標高(m)。無効値は null
export function decodeDemPixel(r: number, g: number, b: number): number | null {
  const x = r * 65536 + g * 256 + b;
  if (x === 2 ** 23) return null;
  return x < 2 ** 23 ? x * 0.01 : (x - 2 ** 24) * 0.01;
}

export type TileFetcher = (z: number, x: number, y: number) => Promise<DecodedPng | null>;

// ネットワーク越しにタイルを取り、複数回参照に備えてキャッシュする
export function makeDemSampler(fetchTile: TileFetcher, z: number): (px: number, py: number) => Promise<number | null> {
  const cache = new Map<string, Promise<DecodedPng | null>>();
  const get = (tx: number, ty: number) => {
    const key = `${tx},${ty}`;
    if (!cache.has(key)) cache.set(key, fetchTile(z, tx, ty));
    return cache.get(key)!;
  };
  // 画素中心基準の双線形補間
  return async (px, py) => {
    const cx = px - 0.5;
    const cy = py - 0.5;
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const tx = cx - x0;
    const ty = cy - y0;
    const vals: [number, number | null][] = [];
    const needed = new Set<string>();
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      needed.add(`${Math.floor((x0 + dx) / TILE_SIZE)},${Math.floor((y0 + dy) / TILE_SIZE)}`);
    }
    for (const key of needed) {
      const [tx2, ty2] = key.split(",").map(Number);
      await get(tx2, ty2);
    }
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const gx = x0 + dx;
      const gy = y0 + dy;
      const tile = await get(Math.floor(gx / TILE_SIZE), Math.floor(gy / TILE_SIZE));
      const lx = ((gx % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
      const ly = ((gy % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
      const w = (dx === 0 ? 1 - tx : tx) * (dy === 0 ? 1 - ty : ty);
      if (!tile || tile.channels < 3) {
        vals.push([w, null]);
      } else {
        const i = (ly * tile.width + lx) * tile.channels;
        vals.push([w, decodeDemPixel(tile.data[i], tile.data[i + 1], tile.data[i + 2])]);
      }
    }
    let v = 0;
    for (const [w, val] of vals) {
      if (w < 1e-9) continue;
      if (val === null) return null;
      v += w * val;
    }
    return v;
  };
}
