// 寄り道地点のピンをどこに立てるかを決める（地図に依存しない部分）。

export type LatLng = { lat: number; lng: number };

/** 地点を固定したルート。 */
export type FixedRoute = { start: LatLng; checkpoints: readonly [LatLng, LatLng, LatLng]; goal: LatLng };

/** 地名検索の結果を採用する、目的地からの距離の上限（km）。これより遠い結果は別の場所とみなす。 */
const MAX_FROM_GOAL_KM = 5;
/** これより目的地に近い結果は、地点名が見つからず目的地名にだけ一致したとみなす（km）。 */
const MIN_FROM_GOAL_KM = 0.05;

export function distKm(a: LatLng, b: LatLng): number {
  const dy = (a.lat - b.lat) * 111;
  const dx = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

// 出発地→目的地の線の上で、どれくらい進んだ位置か（0=出発地、1=目的地）
function progress(a: LatLng, b: LatLng, p: LatLng): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len2 = dx * dx + dy * dy;
  return len2 === 0 ? 0 : ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / len2;
}

type PickInput = {
  start: LatLng;
  goal: LatLng;
  /** 見つからなかったときの仮の位置（地点ごと）。 */
  fallback: readonly LatLng[];
  /** 地名検索の結果（地点ごと。見つからなければ null）。 */
  found: readonly (LatLng | null | undefined)[];
};

type PickResult = {
  route: FixedRoute;
  /** 並べ替えたあとの各地点が、元の何番目か。 */
  order: number[];
  /** 並べ替えたあとの各地点が、地名検索で見つかったか（false なら仮の位置）。 */
  located: [boolean, boolean, boolean];
};

/** 地名検索の結果を使えるものだけ採用し、出発地から目的地へ向かう順に並べる。 */
export function pickCheckpoints({ start, goal, fallback, found }: PickInput): PickResult {
  const picked = fallback.slice(0, 3).map((f, i) => {
    const g = found[i];
    const ok = !!g && distKm(g, goal) < MAX_FROM_GOAL_KM && distKm(g, goal) > MIN_FROM_GOAL_KM;
    return { pos: ok ? g : f, located: ok };
  });
  // 行ったり来たりしないよう、出発地から目的地へ向かう順に並べる（クエストの順番も呼び出し側で揃える）
  const order = picked.map((_, i) => i).sort((x, y) => progress(start, goal, picked[x].pos) - progress(start, goal, picked[y].pos));
  const [a, b, c] = order.map((i) => picked[i]);
  return {
    route: { start, checkpoints: [a.pos, b.pos, c.pos], goal },
    order,
    located: [a.located, b.located, c.located],
  };
}
