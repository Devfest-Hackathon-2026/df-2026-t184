// 国土地理院 標高タイル（dem5a_png, z15, 5mメッシュ）から地区の標高グリッドを作る。
// 使い方: node scripts/terrain/build-elevation-grid.ts
// 出力: public/terrain/ueno-yanaka.elevation.json（10m 間隔・Int16 dm・base64）

import { mkdirSync, writeFileSync } from "node:fs";
import { toLatLng, toXY } from "../../src/lib/terrain/geo.ts";
import { encodeElevationGrid, type ElevationGrid } from "../../src/lib/terrain/grid-codec.ts";
import { lngLatToPixel, makeDemSampler, DEM_LAYER, DEM_ZOOM } from "./gsi.ts";
import { decodePng } from "./png.ts";

// 上野公園〜谷中〜鶯谷を囲む範囲（南西・北東の端）
const BBOX = { south: 35.706, west: 139.756, north: 35.736, east: 139.786 };
const CELL_M = 10;
const OUT = "public/terrain/ueno-yanaka.elevation.json";
const SOURCE = "国土地理院 標高タイル dem5a_png（数値標高モデル5mメッシュ・基盤地図情報DLデータのタイル版）z15";

async function fetchTile(z: number, x: number, y: number) {
  const url = `https://cyberjapandata.gsi.go.jp/xyz/${DEM_LAYER}/${z}/${x}/${y}.png`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`タイル取得失敗 ${res.status}: ${url}`);
  }
  return decodePng(new Uint8Array(await res.arrayBuffer()));
}

async function main() {
  const origin = { lat: BBOX.south, lng: BBOX.west };
  const ne = toXY({ lat: BBOX.north, lng: BBOX.east }, origin);
  const cols = Math.ceil(ne.x / CELL_M);
  const rows = Math.ceil(ne.y / CELL_M);

  const sampler = makeDemSampler(fetchTile, DEM_ZOOM);
  const data = new Int16Array(cols * rows);
  const NO_DATA = -32768;
  let missing = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const p = toLatLng({ x: (col + 0.5) * CELL_M, y: (row + 0.5) * CELL_M }, origin);
      const { px, py } = lngLatToPixel(p.lng, p.lat, DEM_ZOOM);
      const h = await sampler(px, py);
      data[row * cols + col] = h === null ? NO_DATA : Math.round(h * 10); // dm
      if (h === null) missing++;
    }
    if (row % 40 === 0) process.stderr.write(`\r${row}/${rows} 行`);
  }
  process.stderr.write("\n");

  const grid: ElevationGrid = { cellMeters: CELL_M, originLat: origin.lat, originLng: origin.lng, cols, rows, noData: NO_DATA, data };
  const json = encodeElevationGrid(grid, SOURCE);
  mkdirSync("public/terrain", { recursive: true });
  writeFileSync(OUT, json);
  console.log(`${OUT}: ${cols}x${rows} セル, ${(json.length / 1024).toFixed(0)}KB, 欠損 ${missing}/${data.length}`);
}

await main();
