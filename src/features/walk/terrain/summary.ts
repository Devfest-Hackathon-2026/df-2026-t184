import { sampleElevation, slopeMetrics } from "@/lib/terrain/elevation";
import { samplePolyline, type LatLng } from "@/lib/terrain/geo";
import type { ElevationGrid, ShadeGrid } from "@/lib/terrain/grid-codec";
import { shadeStats } from "@/lib/terrain/shade";

// /terrain と同じ集計条件（src/components/TerrainCompare.tsx）
const SAMPLE_INTERVAL_M = 10;
const SMOOTHING_WINDOW_SAMPLES = 3;
const GRADIENT_BASELINE_M = 10;
/** ルートのうち標高データで評価できた割合がこれ未満なら、値を出さない（欠けたデータで判定しない）。 */
const MIN_COVERAGE = 0.8;

export enum TerrainArea {
  Inside = "inside",
  Outside = "outside",
}

export type RouteTerrain =
  | { area: TerrainArea.Outside }
  | {
      area: TerrainArea.Inside;
      ascentM: number | null;
      maxGradientPct: number | null;
      coverage: number;
      shade: { label: string; ratio: number | null }[];
    };

/** ルートの坂（上りの合計・最大勾配）と、時刻ごとの日陰の割合を、事前計算グリッドから推定する。 */
export const summarizeTerrain = (path: readonly LatLng[], elev: ElevationGrid, shade: ShadeGrid): RouteTerrain => {
  if (path.length < 2) return { area: TerrainArea.Outside };
  const { points, distM } = samplePolyline([...path], SAMPLE_INTERVAL_M);
  const slope = slopeMetrics(
    { distM, elevationM: points.map((p) => sampleElevation(elev, p)) },
    { smoothingWindowSamples: SMOOTHING_WINDOW_SAMPLES, gradientBaselineM: GRADIENT_BASELINE_M },
  );
  if (slope.coverage < MIN_COVERAGE) return { area: TerrainArea.Outside };
  return {
    area: TerrainArea.Inside,
    ascentM: slope.ascentM,
    maxGradientPct: slope.maxGradientPct,
    coverage: slope.coverage,
    shade: shade.times.map((t, i) => ({ label: t.label, ratio: shadeStats(shade, points, { distM }, i).shadeRatio })),
  };
};
