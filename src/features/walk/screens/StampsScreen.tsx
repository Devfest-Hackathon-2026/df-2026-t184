import { cx, ScreenHeading, Stamp, StickerCard } from "@/components/sticker";

import { BADGES } from "../badges";
import type { AlbumEntry } from "../content";
import { nextTitle, pointBreakdown, POINTS_NOT_SAVED_NOTE, POINTS_SAMPLE_NOTE, titleOf, totalPoints, walkPoints } from "../points";

type StampsScreenProps = { album: readonly AlbumEntry[] };

/** 寄り道でもらえるハンコを、もらったものと空き枠で並べる画面。 */
export const StampsScreen = ({ album }: StampsScreenProps): React.ReactElement => {
  const earned = BADGES.filter((b) => b.earned(album)).length;
  const mine = album.filter((e) => !e.sample);
  const points = totalPoints(album);
  const title = titleOf(points);
  const next = nextTitle(points);
  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-col gap-1">
        <ScreenHeading className="font-hand text-2xl text-ink">ハンコ帳</ScreenHeading>
        <p className="text-xs text-ink-soft">
          {BADGES.length} こ中 {earned} こ集めました
        </p>
      </header>

      <StickerCard className="flex flex-col gap-2 p-4">
        <section aria-labelledby="points-heading" className="flex flex-col gap-2">
          <h2 id="points-heading" className="font-hand text-lg text-ink">
            ポイントと称号
          </h2>
          <p className="flex items-baseline gap-2">
            <span className="font-hand text-3xl text-ink">
              {points} pt
            </span>
            <span className="font-hand text-base text-ink">称号：{title.label}</span>
          </p>
          <p className="font-note text-xs text-ink-soft">
            {next ? `あと ${next.remaining} pt で「${next.title.label}」` : "いちばん上の称号です"}
          </p>
          {mine.length > 0 ? (
            <ul aria-label="寄り道ごとのポイント" className="flex flex-col gap-1">
              {mine.map((e) => (
                <li key={e.id} className="font-note text-xs text-ink-soft">
                  {e.walkedOn} {e.dest}：+{walkPoints(e)} pt（{pointBreakdown(e).map((l) => `${l.label} +${l.points}`).join("・")}）
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-note text-xs text-ink-soft">寄り道して地点を記録すると、ポイントが付きます</p>
          )}
          <p role="note" className="text-xs text-ink-soft">
            {POINTS_NOT_SAVED_NOTE}。{POINTS_SAMPLE_NOTE}
          </p>
        </section>
      </StickerCard>

      <div className="flex items-center gap-3">
        <p className="font-note text-sm text-fg-subtle">
          {earned === BADGES.length ? "ぜんぶ集まったね！" : "次はどのハンコをねらう？"}
        </p>
      </div>

      <StickerCard className="p-4">
        <ul className="grid grid-cols-2 gap-4">
          {BADGES.map((badge) => {
            const got = badge.earned(album);
            return (
              <li
                key={badge.id}
                className={cx(
                  "flex flex-col items-center gap-2 rounded-(--radius-chip) border p-3 text-center",
                  got ? "border-line bg-paper" : "border-dashed border-line",
                )}
              >
                {got ? (
                  <Stamp className="size-20">{badge.label}</Stamp>
                ) : (
                  <span aria-hidden="true" className="grid size-20 place-items-center rounded-full border border-dashed border-line font-hand text-2xl text-ink-soft">
                    ?
                  </span>
                )}
                <span className="font-hand text-sm text-ink">{got ? badge.label : "まだ"}</span>
                <span className="font-note text-xs text-ink-soft">{got ? "押しました" : badge.hint}</span>
              </li>
            );
          })}
        </ul>
      </StickerCard>
    </div>
  );
};
