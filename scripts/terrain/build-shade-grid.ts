// PLATEAU の建物（lod1Solid の脚注＋棟頂）と太陽位置から、地区の日陰グリッドを作る。
// 使い方: node scripts/terrain/build-shade-grid.ts --gml-dir <bldg GML を置いたdir> --date 2026-11-14 --hours 7-16
//   --date  評価する日付（JST）
//   --hours 評価する毎正時の範囲（JST、両端を含む）。太陽高度が 0 以下の時刻が含まれるとエラーで止める
// 出力: public/terrain/ueno-yanaka.shade.json
//
// 方式: セル中心から太陽方向へ光線を伸ばし、途中の建物の棟頂が光線高より高ければ日陰。
// bit0..14 = 各時刻の日陰（--hours の順）、bit15 = 評価不能（地面標高なし等）。

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toXY } from "../../src/lib/terrain/geo.ts";
import {
  decodeElevationGrid,
  encodeShadeGrid,
  SHADE_MAX_TIMES,
  SHADE_UNEVALUABLE,
  type ShadeGrid,
} from "../../src/lib/terrain/grid-codec.ts";
import { solarPosition } from "../../src/lib/terrain/sun.ts";
import { parseBldgGml, pointInPolygon, type Building } from "./plateau.ts";

const ELEVATION_JSON = "public/terrain/ueno-yanaka.elevation.json";
const OUT = "public/terrain/ueno-yanaka.shade.json";
const SOURCE = "PLATEAU 台東区 CityGML 2024年度（bldg, CC BY 4.0）＋ NOAA 太陽位置近似式";
const MARGIN_M = 400; // 影が届きうる余白（これより遠い建物は評価しない）
const MAX_RAY_M = 380; // 光線を追う最大距離（MARGIN より内側に収める）

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// --date と --hours から評価時刻（JST の毎正時）を組み立てる
function parseTimes(date: string | undefined, hours: string | undefined): ShadeGrid["times"] {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--date YYYY-MM-DD が必要です（JST の日付）");
  const m = hours ? /^(\d{1,2})-(\d{1,2})$/.exec(hours) : null;
  if (!m) throw new Error("--hours <開始時>-<終了時> が必要です（例: 7-16。JST の毎正時、両端を含む）");
  const from = Number(m[1]);
  const to = Number(m[2]);
  if (from > to || to > 23) throw new Error(`--hours の範囲が不正です: ${hours}`);
  if (to - from + 1 > SHADE_MAX_TIMES) throw new Error(`時刻は最大 ${SHADE_MAX_TIMES} 個までです（bit15 を評価不能に使う）: ${hours}`);
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const hh = String(from + i).padStart(2, "0");
    return { label: `${hh}:00`, at: `${date}T${hh}:00:00+09:00` };
  });
}

async function main() {
  const gmlDir = arg("--gml-dir");
  if (!gmlDir) throw new Error("--gml-dir <bldg GML を展開したディレクトリ> が必要です");
  const requestedTimes = parseTimes(arg("--date"), arg("--hours"));

  const elev = decodeElevationGrid(readFileSync(ELEVATION_JSON, "utf8"));
  const origin = { lat: elev.originLat, lng: elev.originLng };
  const cell = elev.cellMeters;

  // 拡張グリッド（評価グリッド + 四方 MARGIN_M）のセル範囲
  const marginCells = Math.ceil(MARGIN_M / cell);
  const cols = elev.cols;
  const rows = elev.rows;
  const xCols = cols + marginCells * 2;
  const xRows = rows + marginCells * 2;

  // 1. 建物を読み、棟頂標高を拡張グリッドにラスタライズ
  const files = readdirSync(gmlDir).filter((f) => f.endsWith(".gml"));
  if (files.length === 0) throw new Error(`${gmlDir} に .gml がありません`);
  const top = new Float32Array(xCols * xRows).fill(NaN);
  let count = 0;
  let inArea = 0;

  for (const f of files) {
    const xml = readFileSync(join(gmlDir, f), "utf8");
    const buildings = parseBldgGml(xml);
    count += buildings.length;
    for (const b of buildings) {
      inArea += rasterize(b) ? 1 : 0;
    }
    process.stderr.write(`${f}: 累計 ${count} 棟\n`);
  }

  function rasterize(b: Building): boolean {
    const pts = b.footprint.map((p) => toXY(p, origin));
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    // 拡張グリッドとの交差判定（拡張グリッドの原点は -MARGIN_M,-MARGIN_M）
    if (maxX < -MARGIN_M || maxY < -MARGIN_M || minX > cols * cell + MARGIN_M || minY > rows * cell + MARGIN_M) return false;
    const c0 = Math.max(0, Math.floor((minX + MARGIN_M) / cell));
    const c1 = Math.min(xCols - 1, Math.floor((maxX + MARGIN_M) / cell));
    const r0 = Math.max(0, Math.floor((minY + MARGIN_M) / cell));
    const r1 = Math.min(xRows - 1, Math.floor((maxY + MARGIN_M) / cell));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const p = { x: (c + 0.5) * cell - MARGIN_M, y: (r + 0.5) * cell - MARGIN_M };
        if (pointInPolygon(p, pts)) {
          const i = r * xCols + c;
          if (!(top[i] > b.topM)) top[i] = b.topM; // 高い棟を優先
        }
      }
    }
    return true;
  }

  // 2. 各時刻・各セルで日陰判定
  const data = new Uint16Array(cols * rows);
  const times: { label: string; at: string; alt: number; dx: number; dy: number; tanAlt: number }[] = [];
  for (const t of requestedTimes) {
    const sun = solarPosition(new Date(t.at), origin.lat, origin.lng);
    if (!sun) throw new Error(`${t.at} は夜間のため日陰評価を作りません`);
    const az = (sun.azimuthDeg * Math.PI) / 180;
    times.push({ ...t, alt: sun.altitudeDeg, dx: Math.sin(az), dy: Math.cos(az), tanAlt: Math.tan((sun.altitudeDeg * Math.PI) / 180) });
    console.log(`${t.at}: 太陽高度 ${sun.altitudeDeg.toFixed(1)}°, 方位 ${sun.azimuthDeg.toFixed(1)}°`);
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ei = row * cols + col;
      const groundDm = elev.data[ei];
      if (groundDm === elev.noData) {
        data[ei] = SHADE_UNEVALUABLE; // 地面標高なし → 評価不能
        continue;
      }
      const groundZ = groundDm / 10;
      const cx = (col + 0.5) * cell;
      const cy = (row + 0.5) * cell;
      for (let ti = 0; ti < times.length; ti++) {
        const t = times[ti];
        let shaded = false;
        for (let d = cell * 0.5; d <= MAX_RAY_M; d += cell) {
          const rx = cx + t.dx * d;
          const ry = cy + t.dy * d;
          const xc = Math.floor((rx + MARGIN_M) / cell);
          const xr = Math.floor((ry + MARGIN_M) / cell);
          if (xc < 0 || xr < 0 || xc >= xCols || xr >= xRows) break; // 拡張範囲外（MARGIN>MAX_RAY なら到達しない）
          const b = top[xr * xCols + xc];
          if (!Number.isNaN(b) && b > groundZ + d * t.tanAlt) {
            shaded = true;
            break;
          }
        }
        if (shaded) data[ei] |= 1 << ti;
      }
    }
    if (row % 40 === 0) process.stderr.write(`\r日陰判定 ${row}/${rows} 行`);
  }
  process.stderr.write("\n");

  // 3. 時刻ごとの地区全体の集計（再生成時に前の版と比べるための数字）
  const totalCells = cols * rows;
  let evaluable = 0;
  for (const v of data) if (!(v & SHADE_UNEVALUABLE)) evaluable++;
  console.log(`評価不能セル: ${totalCells - evaluable} / ${totalCells}（${((100 * (totalCells - evaluable)) / totalCells).toFixed(1)}%）`);
  times.forEach((t, ti) => {
    let shaded = 0;
    for (const v of data) if (!(v & SHADE_UNEVALUABLE) && v & (1 << ti)) shaded++;
    console.log(`${t.label}: 日陰 ${shaded} / ${evaluable} 評価済みセル（${((100 * shaded) / evaluable).toFixed(1)}%）`);
  });

  const grid: ShadeGrid = { cellMeters: cell, originLat: origin.lat, originLng: origin.lng, cols, rows, times: requestedTimes, data };
  const json = encodeShadeGrid(grid, SOURCE);
  mkdirSync("public/terrain", { recursive: true });
  writeFileSync(OUT, json);
  console.log(`${OUT}: ${cols}x${rows} セル, ${(json.length / 1024).toFixed(0)}KB（建物 ${count} 棟中 ${inArea} 棟を使用）`);
}

await main();
