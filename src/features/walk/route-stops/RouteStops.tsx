import { ButtonSize, ButtonVariant, cx, IconName, IconSticker, StickerButton, Tone } from "@/components/sticker";

import type { Quest } from "../content";
import type { Leg } from "../terrain/legs";
import { TerrainArea, type RouteTerrain } from "../terrain/summary";

type RouteStopsProps = {
  quests: readonly Quest[];
  /** いま向かっている地点（0 始まり）。3 なら全部終わった。 */
  step: number;
  /** 出発地→地点1→地点2→地点3→目的地 の 4 区間。まだ計算していなければ空。 */
  legs: readonly Leg[];
  /** 各地点が地図の地名検索で見つかったか。false の地点はピンが仮の位置。省略時は全部見つかった扱い。 */
  located?: readonly boolean[];
  onFound: () => void;
  onCapture: () => void;
};

const pct = (r: number | null): string => (r === null ? "不明" : `${Math.round(r * 100)}%`);

/** 区間の坂・日陰を短い言葉にする。範囲外なら null。 */
const legWords = (t: RouteTerrain | undefined): { slope: string; shade: string; steep: boolean } | null => {
  if (!t || t.area !== TerrainArea.Inside) return null;
  const slope = t.ascentM === null ? "坂 不明" : t.ascentM < 3 ? "坂ほぼなし" : `上り ${Math.round(t.ascentM)}m`;
  return { slope, shade: `日陰 ${pct(t.shade[0]?.ratio ?? null)}`, steep: (t.maxGradientPct ?? 0) >= 8 };
};

const Tags = ({ leg }: { leg: Leg | undefined }): React.ReactElement | null => {
  const w = legWords(leg?.terrain);
  if (!w) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded-md bg-sky px-2 py-0.5 font-note text-xs text-sky-ink">{w.slope}</span>
      {w.steep ? <span className="rounded-md bg-coral px-2 py-0.5 font-note text-xs text-coral-ink">急な坂あり</span> : null}
      <span className="rounded-md bg-mint px-2 py-0.5 font-note text-xs text-mint-deep">{w.shade}</span>
    </div>
  );
};

const SCORE_LABELS = ["静けさ", "レトロ", "ローカル"] as const;

/** AI が付けた点数を1行で小さく出す。 */
const Scores = ({ scores }: { scores: readonly [number, number, number] }): React.ReactElement => (
  <dl className="flex gap-3 font-note text-xs text-ink-soft">
    {SCORE_LABELS.map((label, i) => (
      <div key={label} className="flex items-baseline gap-1">
        <dt>{label}</dt>
        <dd className="text-ink tabular-nums">{scores[i]}</dd>
      </div>
    ))}
  </dl>
);

const Progress = ({ done, total }: { done: number; total: number }): React.ReactElement => (
  <div role="img" aria-label={`${total} 地点のうち ${done} 地点を達成`} className="flex flex-1 items-center gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <span key={i} className={cx("h-1 flex-1 rounded-full", i < done ? "bg-accent" : "bg-line")} />
    ))}
  </div>
);

/** 通る地点を縦に並べる。いまの地点だけを開いて、クエストと「記録する」「見つけた」を出す。 */
export const RouteStops = ({ quests, step, legs, located, onFound, onCapture }: RouteStopsProps): React.ReactElement => {
  const outside = legs.length > 0 && legs.every((l) => l.terrain.area === TerrainArea.Outside);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Progress done={Math.min(step, quests.length)} total={quests.length} />
        <span className="font-note text-xs text-ink-soft tabular-nums">
          {Math.min(step, quests.length)} / {quests.length}
        </span>
      </div>
      <ol className="flex flex-col">
        {quests.map((quest, i) => {
          const isCurrent = i === step;
          const isDone = i < step;
          const showQuest = isCurrent;
          const isLocated = located?.[i] !== false;
          // legs[i] は1つ前の地点（または出発地）からこの地点までの区間。どちらかが仮の位置なら実際の道ではない
          const legIsReal = isLocated && (i === 0 || located?.[i - 1] !== false);
          return (
            <li key={quest.checkpoint + i} aria-current={isCurrent ? "step" : undefined} className="relative grid grid-cols-[28px_1fr] gap-3 pb-4">
              {i < quests.length - 1 ? <span aria-hidden="true" className="absolute top-8 bottom-0 left-[13px] border-l-2 border-dotted border-line" /> : null}
              <span
                aria-hidden="true"
                className={cx(
                  "z-10 grid size-7 place-items-center rounded-full border-2 font-note text-xs font-bold",
                  isDone ? "border-ink bg-ink text-fg-on-deep" : isCurrent ? "border-accent bg-accent text-fg-on-deep" : "border-ink bg-sticker text-ink",
                )}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <div
                  className={cx(
                    "flex flex-col gap-2",
                    showQuest ? "rounded-2xl border bg-sticker px-4 py-3.5" : "",
                    showQuest && isCurrent ? "border-accent" : "border-line",
                  )}
                >
                  <p className={cx("font-note text-sm font-bold", isDone ? "text-ink-soft" : "text-ink")}>{quest.checkpoint}</p>
                  {isLocated ? null : <p className="font-note text-xs text-ink-soft">地図で見つからず、ピンは仮の位置です（「?」のピン）</p>}
                  {showQuest ? (
                    <>
                      <h2 className="font-hand text-base leading-snug text-ink">{quest.title}</h2>
                      {isCurrent ? <p className="font-note text-xs leading-relaxed text-ink-soft">{quest.why}</p> : null}
                      {isCurrent && quest.scores ? <Scores scores={quest.scores} /> : null}
                    </>
                  ) : null}
                  {!isDone && legIsReal ? <Tags leg={legs[i]} /> : null}
                  {isCurrent ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <StickerButton variant={ButtonVariant.Plain} size={ButtonSize.Lg} onClick={onCapture}>
                        <IconSticker name={IconName.Camera} tone={Tone.Sky} size={24} />
                        記録する
                      </StickerButton>
                      <StickerButton size={ButtonSize.Lg} onClick={onFound}>
                        見つけた
                      </StickerButton>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {outside ? <p className="font-note text-xs text-ink-soft">坂・日陰は上野〜谷中だけ推定して出します（このルートは対象外）</p> : null}
    </div>
  );
};
