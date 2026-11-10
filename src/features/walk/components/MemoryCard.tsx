import { cx, StickerCard, Stamp, TONE_FILL } from "@/components/sticker";

import type { Mood, Quest } from "../content";
import { CHECKPOINTS, type WalkState } from "../flow";
import { PhotoArt } from "./PhotoSlot";
import { MapVariant, RouteMap } from "./RouteMap";

const CHIP_CLASS = "rounded-(--radius-chip) border border-line px-3 py-1 font-hand text-sm text-ink shadow-sticker-sm";

type MemoryCardProps = Pick<WalkState, "dest" | "shots" | "memos"> & {
  mood: Mood;
  quests: readonly Quest[];
  extraMinutes: number;
  walkedOn: string;
};

/** 思い出カードの文章が見本であることの知らせ。AI はまだ文章を書いていない。 */
export const MEMORY_ESSAY_NOTE = "文章は気分ごとの見本です（AIが写真やメモから書いたものではありません）";
/** 寄り道の分数が経路から計算した値ではないことの知らせ。 */
export const MEMORY_MINUTES_NOTE = "分数は選んだ寄り道時間からの目安です（実際に歩いた時間ではありません）";
/** 写真の欄が見本の絵であることの知らせ。 */
export const MEMORY_PHOTO_NOTE = "写真は見本の絵です（実際には撮影していません）";

/** 共有する思い出カード。写真の帯、見本の文章、地点ごとのメモ、達成のハンコを 1 枚にまとめる。 */
export const MemoryCard = ({ dest, mood, quests, shots, memos, extraMinutes, walkedOn }: MemoryCardProps): React.ReactElement => (
  <StickerCard className="flex flex-col gap-4 pt-8">

    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-hand text-xs text-ink-soft">{walkedOn}</p>
        <h2 className="font-hand text-xl leading-snug text-ink">{dest}への寄り道</h2>
      </div>
      <div className="size-24 shrink-0 overflow-hidden rounded-(--radius-chip) border border-line shadow-sticker-sm">
        <RouteMap step={CHECKPOINTS} dest={dest} variant={MapVariant.Mini} />
      </div>
    </header>

    <ul className="grid grid-cols-3 gap-3 px-1">
      {quests.map((quest, i) => (
        <li
          key={quest.checkpoint}
          className="border border-line bg-sticker p-1 pb-2 shadow-sticker-sm"
        >
          {shots[i] ? (
            <div className="overflow-hidden border border-line">
              <PhotoArt tone={quest.tone} label={`${quest.checkpoint}の写真（見本）`} className="aspect-square" />
            </div>
          ) : (
            <p className="grid aspect-square place-items-center border border-dashed border-line font-hand text-xs text-ink-soft">写真なし</p>
          )}
          <p className="pt-1 text-center font-hand text-xs text-ink">{i + 1}</p>
        </li>
      ))}
    </ul>

    <p className="font-note text-base leading-loose text-ink">{mood.essay}</p>

    <dl className="flex flex-col gap-2 rounded-(--radius-chip) border border-dashed border-line p-3">
      {quests.map((quest, i) => (
        <div key={quest.checkpoint} className="flex flex-col">
          <dt className={cx("self-start rounded-sm px-1 font-hand text-sm text-ink", TONE_FILL[quest.tone])}>{quest.checkpoint}</dt>
          <dd className={cx("pl-1 font-note text-sm leading-relaxed", memos[i] ? "text-ink" : "text-ink-soft")}>{memos[i] || "メモなし"}</dd>
        </div>
      ))}
    </dl>

    <footer className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <span className={cx(CHIP_CLASS, TONE_FILL[mood.tone])}>{mood.label}</span>
          <span className={cx(CHIP_CLASS, "bg-pink")}>+{extraMinutes}分（目安）</span>
        </div>
      </div>
      <Stamp className="mr-2 shrink-0">
        寄り道
        <br />
        達成
        <br />
        {CHECKPOINTS}/{CHECKPOINTS}
      </Stamp>
    </footer>

    <ul className="flex flex-col gap-1 text-xs text-ink-soft">
      <li>{MEMORY_PHOTO_NOTE}</li>
      <li>{MEMORY_ESSAY_NOTE}</li>
      <li>{MEMORY_MINUTES_NOTE}</li>
    </ul>
  </StickerCard>
);
