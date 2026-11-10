// 緯度経度をメートル座標に直す・経路を一定間隔でサンプリングする純粋関数。
// 数km 程度の範囲を前提に等距円筒近似を使う（この地区では誤差は無視できる）。

export type LatLng = { lat: number; lng: number };

export type XY = { x: number; y: number };

// 緯度1度あたりのメートル数。WGS84 楕円体での近似式 m1 + m2·cos2φ + m3·cos4φ の定数項 m1
// （出典: https://en.wikipedia.org/wiki/Latitude#Meridian_distance_on_the_ellipsoid 、m1=111132.954m）。
// 緯度によらない定数として使うので、この地区（北緯35.7度付近）の実際の値（同じ式で約110,954m）より約0.16%大きい。
// 地区の南北 約3.3km で約5m の差になる。コミット済みの標高・日陰グリッドはこの値で座標を決めて生成したため、
// グリッドと表示の位置を揃えるために値を変えない（変えるならグリッドも再生成する）。
export const METERS_PER_DEG_LAT = 111132.954;

export function toXY(p: LatLng, origin: LatLng): XY {
  return {
    x: (p.lng - origin.lng) * METERS_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180),
    y: (p.lat - origin.lat) * METERS_PER_DEG_LAT,
  };
}

export function toLatLng(p: XY, origin: LatLng): LatLng {
  return {
    lat: origin.lat + p.y / METERS_PER_DEG_LAT,
    lng: origin.lng + p.x / (METERS_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180)),
  };
}

export function distanceM(a: LatLng, b: LatLng, origin: LatLng): number {
  const pa = toXY(a, origin);
  const pb = toXY(b, origin);
  return Math.hypot(pb.x - pa.x, pb.y - pa.y);
}

export type SampledRoute = {
  points: LatLng[];
  // distM[i] = i-1 → i の距離（distM[0] = 0）
  distM: number[];
};

// 折れ線を intervalM 間隔で打ち直す。先頭と終端は必ず含める
export function samplePolyline(path: LatLng[], intervalM: number): SampledRoute {
  if (path.length === 0) return { points: [], distM: [] };
  const origin = path[0];
  const xy = path.map((p) => toXY(p, origin));

  const points: LatLng[] = [path[0]];
  const distM: number[] = [0];
  let carry = 0;

  for (let i = 1; i < xy.length; i++) {
    const a = xy[i - 1];
    const b = xy[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen === 0) continue;
    let d = intervalM - carry;
    while (d < segLen) {
      const t = d / segLen;
      points.push(toLatLng({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, origin));
      distM.push(intervalM);
      d += intervalM;
    }
    carry = segLen - (d - intervalM);
  }

  // 終端（間隔ちょうどの場合は重複しない）
  const last = xy[xy.length - 1];
  const lastSample = toXY(points[points.length - 1], origin);
  const rest = Math.hypot(last.x - lastSample.x, last.y - lastSample.y);
  if (rest > 1e-6) {
    points.push(path[path.length - 1]);
    distM.push(rest);
  }

  return { points, distM };
}
