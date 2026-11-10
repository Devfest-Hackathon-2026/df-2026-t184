// PLATEAU CityGML（bldg）の最小パーサ。日陰計算に必要なものだけ取る:
// - lod1Solid の posList（座標は EPSG:6697 = 緯度,経度,標高 の順。EPSG:6697 は JGD2011 の緯度経度＋標高の複合座標系
//   （現在の名称は「JGD2024 + JGD2011 (vertical) height」）: https://epsg.io/6697 ）
// - bldg:measuredHeight（-9999 は欠損として扱う）
// 脚注ポリゴンは「平均標高が最小のポリゴン」とし、棟頂は全頂点の最大標高とする。

import type { LatLng } from "../../src/lib/terrain/geo.ts";

export type Building = {
  footprint: LatLng[]; // lod1Solid の最下面ポリゴン（頂点順）
  topM: number; // 棟頂の絶対標高 = lod1Solid 全頂点の最大 z
  heightM: number | null; // measuredHeight（-9999 は欠損 → null）
};

const BUILDING_RE = /<bldg:Building[\s>][\s\S]*?<\/bldg:Building>/g;
const SOLID_RE = /<bldg:lod1Solid>[\s\S]*?<\/bldg:lod1Solid>/;
const POSLIST_RE = /<gml:posList[^>]*>([\d.eE+\-\s]+)<\/gml:posList>/g;
const HEIGHT_RE = /<bldg:measuredHeight[^>]*>([\-\d.]+)</;

export function parseBldgGml(xml: string): Building[] {
  const buildings: Building[] = [];
  for (const m of xml.matchAll(BUILDING_RE)) {
    const b = parseBuilding(m[0]);
    if (b) buildings.push(b);
  }
  return buildings;
}

function parseBuilding(chunk: string): Building | null {
  const solid = SOLID_RE.exec(chunk);
  if (!solid) return null; // lod1Solid が無い棟は体積が分からないので除外（補完しない）

  const polys: { ring: { p: LatLng; z: number }[]; meanZ: number }[] = [];
  let topM = -Infinity;
  for (const pm of solid[0].matchAll(POSLIST_RE)) {
    const nums = pm[1].trim().split(/\s+/).map(Number);
    const ring: { p: LatLng; z: number }[] = [];
    for (let i = 0; i + 2 < nums.length; i += 3) {
      ring.push({ p: { lat: nums[i], lng: nums[i + 1] }, z: nums[i + 2] });
      if (nums[i + 2] > topM) topM = nums[i + 2];
    }
    if (ring.length >= 3) {
      polys.push({ ring, meanZ: ring.reduce((a, v) => a + v.z, 0) / ring.length });
    }
  }
  if (polys.length === 0 || topM === -Infinity) return null;

  const ground = polys.reduce((a, b) => (b.meanZ < a.meanZ ? b : a));
  const footprint = ground.ring.map((v) => v.p);
  // 閉じていない場合に備えて始点を終点に複製しない（point-in-polygon は開いたまま扱える）

  const hm = HEIGHT_RE.exec(chunk);
  const h = hm ? Number(hm[1]) : NaN;
  return { footprint, topM, heightM: Number.isFinite(h) && h >= 0 ? h : null };
}

// 点が多角形内か（レイキャスト・頂点順不問）
export function pointInPolygon(p: { x: number; y: number }, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
