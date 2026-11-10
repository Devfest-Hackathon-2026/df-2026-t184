import { cx, IconName, IconSticker, Tone } from "@/components/sticker";

import type { Care } from "../flow";
import { TerrainArea, type RouteTerrain } from "./summary";

export enum TerrainStatus {
  Loading = "loading",
  /** 地図が使えず、ルートの形が分からない。 */
  NoRoute = "no-route",
  /** 地形データを読み込めなかった。 */
  Failed = "failed",
  Ready = "ready",
}

type RouteTerrainCardProps = {
  status: TerrainStatus;
  detour?: RouteTerrain;
  direct?: RouteTerrain;
  care: Care;
  /** 徒歩ルートが取れず直線で評価したとき。 */
  straight?: boolean;
  className?: string;
};

const pct = (r: number | null): string => (r === null ? "不明" : `${Math.round(r * 100)}%`);
const meters = (m: number | null): string => (m === null ? "不明" : `${Math.round(m)}m`);
/** 日陰は午前（最初の時刻）を代表にする。時刻ごとの値は /terrain で見る。 */
const morningShade = (t: RouteTerrain): number | null => (t.area === TerrainArea.Inside ? (t.shade[0]?.ratio ?? null) : null);

const Row = ({ label, terrain, strong }: { label: string; terrain: RouteTerrain; strong?: boolean }): React.ReactElement | null => {
  if (terrain.area !== TerrainArea.Inside) return null;
  return (
    <div className={cx("flex items-baseline justify-between gap-3 rounded-(--radius-chip) px-3 py-2", strong ? "bg-paper" : "")}>
      <span className="font-hand text-sm text-ink">{label}</span>
      <span className="font-note text-sm text-ink tabular-nums">
        上り {meters(terrain.ascentM)}・最大勾配 {terrain.maxGradientPct === null ? "不明" : `${Math.round(terrain.maxGradientPct)}%`}・日陰{" "}
        {pct(morningShade(terrain))}
      </span>
    </div>
  );
};

/** 坂・日陰を選んだ人に、寄り道ルートが最短より良い点（悪い点）をひと言で伝える。 */
const highlights = (detour: RouteTerrain, direct: RouteTerrain, care: Care): string[] => {
  if (detour.area !== TerrainArea.Inside || direct.area !== TerrainArea.Inside) return [];
  const out: string[] = [];
  if (care.slope && detour.ascentM !== null && direct.ascentM !== null) {
    const diff = Math.round(direct.ascentM - detour.ascentM);
    out.push(diff > 0 ? `最短より上りが ${diff}m 少ない` : diff < 0 ? `最短より上りが ${-diff}m 多い` : "上りは最短と同じくらい");
  }
  const a = morningShade(detour);
  const b = morningShade(direct);
  if (care.shade && a !== null && b !== null) {
    const diff = Math.round((a - b) * 100);
    out.push(diff > 0 ? `最短より日陰が ${diff} ポイント多い` : diff < 0 ? `最短より日陰が ${-diff} ポイント少ない` : "日陰は最短と同じくらい");
  }
  return out;
};

/** ルート画面に出す、いまの寄り道ルートの坂と日陰（上野〜谷中の範囲だけ、推定値）。 */
export const RouteTerrainCard = ({ status, detour, direct, care, straight, className }: RouteTerrainCardProps): React.ReactElement => {
  const wanted = care.slope || care.shade;
  const body = ((): React.ReactNode => {
    if (status === TerrainStatus.Loading) return <p className="font-note text-sm text-ink-soft">坂と日陰を計算しています…</p>;
    if (status === TerrainStatus.NoRoute)
      return <p className="font-note text-sm text-ink-soft">地図のルートが取れないため、坂と日陰は計算できません。</p>;
    if (status === TerrainStatus.Failed) return <p className="font-note text-sm text-ink-soft">地形データを読み込めませんでした。</p>;
    if (!detour || !direct || detour.area !== TerrainArea.Inside)
      return (
        <p className="font-note text-sm text-ink-soft">
          このルートは坂・日陰データの対象外です。いま計算できるのは上野〜谷中（台東区）の範囲だけです。
        </p>
      );
    const notes = highlights(detour, direct, care);
    return (
      <>
        {notes.length ? (
          <ul className="flex flex-col gap-1">
            {notes.map((n) => (
              <li key={n} className="font-hand text-base text-ink">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col gap-1">
          <Row label="寄り道" terrain={detour} strong />
          <Row label="最短" terrain={direct} />
        </div>
        <p className="font-note text-xs leading-relaxed text-ink-soft">
          日陰は夏の午前10時の推定値（国土地理院の標高・PLATEAU の建物から計算、現地は未検証）。
          {straight ? "徒歩ルートが取れなかったため直線で評価しています。" : ""}段差・道幅は分かりません。
        </p>
      </>
    );
  })();
  return (
    <section
      aria-labelledby="route-terrain-heading"
      className={cx(
        "flex flex-col gap-3 rounded-(--radius-chip) border bg-sticker px-4 py-4",
        wanted ? "border-line shadow-sticker-sm" : "border-dashed border-line",
        className,
      )}
    >
      <h2 id="route-terrain-heading" className="flex items-center gap-2 font-hand text-base text-ink">
        <IconSticker name={IconName.Pin} tone={Tone.Mint} size={24} />
        このルートの坂と日陰
      </h2>
      {body}
    </section>
  );
};
