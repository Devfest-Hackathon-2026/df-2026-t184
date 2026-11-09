import { cx, ScreenHeading, Stamp, StickerCard } from "@/components/sticker";

import { BADGES } from "../badges";
import type { AlbumEntry } from "../content";


type StampsScreenProps = { album: readonly AlbumEntry[] };

/** 寄り道でもらえるハンコを、もらったものと空き枠で並べる画面。 */
export const StampsScreen = ({ album }: StampsScreenProps): React.ReactElement => {
  const earned = BADGES.filter((b) => b.earned(album)).length;
  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-col gap-1">
        <ScreenHeading className="font-hand text-2xl text-ink">ハンコ帳</ScreenHeading>
        <p className="text-xs text-ink-soft">
          {BADGES.length} こ中 {earned} こ集めました
        </p>
      </header>

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
