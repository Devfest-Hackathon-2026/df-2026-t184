import { decodeElevationGrid, decodeShadeGrid, type ElevationGrid, type ShadeGrid } from "@/lib/terrain/grid-codec";

export type TerrainGrids = { elev: ElevationGrid; shade: ShadeGrid };

let cached: Promise<TerrainGrids> | null = null;

const fetchText = async (url: string): Promise<string> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`地形データを読み込めませんでした（HTTP ${r.status}）`);
  return r.text();
};

/** 上野〜谷中の標高・日陰グリッド（public/terrain/）を1回だけ読み込む。失敗したら次の呼び出しで読み直す。 */
export const loadTerrainGrids = (): Promise<TerrainGrids> => {
  cached ??= Promise.all([fetchText("/terrain/ueno-yanaka.elevation.json"), fetchText("/terrain/ueno-yanaka.shade.json")])
    .then(([e, s]) => ({ elev: decodeElevationGrid(e), shade: decodeShadeGrid(s) }))
    .catch((e: unknown) => {
      cached = null;
      throw e;
    });
  return cached;
};
