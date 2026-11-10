import { distanceM, type LatLng } from "@/lib/terrain/geo";
import type { ElevationGrid, ShadeGrid } from "@/lib/terrain/grid-codec";

import { summarizeTerrain, type RouteTerrain } from "./summary";

/** 徒歩の速さ（分速80m。不動産の表示規約で使われる目安）。 */
const WALK_M_PER_MIN = 80;

export type Leg = { terrain: RouteTerrain; minutes: number };

/** 寄り道ルートの点を、出発地・各地点・目的地にいちばん近い点で順に区切り、区間ごとの点の並びにする。 */
export const splitAtStops = (path: readonly LatLng[], stops: readonly LatLng[]): LatLng[][] => {
  if (stops.length < 2) return [];
  const origin = stops[0];
  const cuts = [0];
  for (const stop of stops.slice(1, -1)) {
    const from = cuts[cuts.length - 1];
    let best = from;
    for (let i = from; i < path.length; i++) {
      if (distanceM(path[i], stop, origin) < distanceM(path[best], stop, origin)) best = i;
    }
    cuts.push(best);
  }
  cuts.push(path.length - 1);
  return cuts.slice(1).map((end, k) => {
    const leg = path.slice(cuts[k], end + 1);
    return leg.length >= 2 ? leg : [stops[k], stops[k + 1]];
  });
};

const lengthM = (leg: readonly LatLng[]): number =>
  leg.slice(1).reduce((sum, p, i) => sum + distanceM(leg[i], p, leg[0]), 0);

/** 区間ごとの坂・日陰（範囲外は対象外）と徒歩時間。 */
export const summarizeLegs = (path: readonly LatLng[], stops: readonly LatLng[], elev: ElevationGrid, shade: ShadeGrid): Leg[] =>
  splitAtStops(path, stops).map((leg) => ({
    terrain: summarizeTerrain(leg, elev, shade),
    minutes: Math.max(1, Math.round(lengthM(leg) / WALK_M_PER_MIN)),
  }));
