import { cx, StickerCard, Stamp, Tape, Tilt, TONE_FILL, Tone } from "@/components/sticker";

import type { Mood } from "../content";
import { CHECKPOINTS, type WalkState } from "../flow";
import { PhotoArt } from "./PhotoSlot";
import { MapVariant, RouteMap } from "./RouteMap";

const PHOTO_TILT_DEG = 2;
const TAPE_ANGLE_LEFT = -9;
const TAPE_ANGLE_RIGHT = 7;
const CHIP_CLASS = "rounded-(--radius-chip) border-2 border-ink px-3 py-1 font-hand text-sm text-ink shadow-sticker-sm";

type MemoryCardProps = Pick<WalkState, "dest" | "shots" | "memos"> & {
  mood: Mood;
  extraMinutes: number;
  walkedOn: string;
};

/** 共有する思い出カード。写真の帯、Gemini の文章、地点ごとのメモ、達成のハンコを 1 枚にまとめる。 */
export const MemoryCard = ({ dest, mood, shots, memos, extraMinutes, walkedOn }: MemoryCardProps): React.ReactElement => (
  <StickerCard tilt={Tilt.Left} className="flex flex-col gap-4 pt-8">
    <Tape tone={Tone.Pink} angle={TAPE_ANGLE_LEFT} className="-top-3 left-6" />
    <Tape tone={Tone.Sky} angle={TAPE_ANGLE_RIGHT} className="-top-3 right-6" />

    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-hand text-xs text-ink-soft">{walkedOn}</p>
        <h2 className="font-hand text-xl leading-snug text-ink">{dest}への寄り道</h2>
      </div>
      <div className="size-24 shrink-0 rotate-(--tilt-cell) overflow-hidden rounded-(--radius-chip) border-2 border-ink shadow-sticker-sm">
        <RouteMap step={CHECKPOINTS} dest={dest} variant={MapVariant.Mini} />
      </div>
    </header>

    <ul className="grid grid-cols-3 gap-3 px-1">
      {mood.quests.map((quest, i) => (
        <li
          key={quest.checkpoint}
          style={{ rotate: `${i % 2 ? PHOTO_TILT_DEG : -PHOTO_TILT_DEG}deg` }}
          className="border-2 border-ink bg-sticker p-1 pb-2 shadow-sticker-sm"
        >
          {shots[i] ? (
            <div className="overflow-hidden border-2 border-ink">
              <PhotoArt tone={quest.tone} label={`${quest.checkpoint}の写真（見本）`} className="aspect-square" />
            </div>
          ) : (
            <p className="grid aspect-square place-items-center border-2 border-dashed border-ink-soft font-hand text-xs text-ink-soft">写真なし</p>
          )}
          <p className="pt-1 text-center font-hand text-xs text-ink">{i + 1}</p>
        </li>
      ))}
    </ul>

    <p className="font-note text-base leading-loose text-ink">{mood.essay}</p>

    <dl className="flex flex-col gap-2 rounded-(--radius-chip) border-2 border-dashed border-ink-soft p-3">
      {mood.quests.map((quest, i) => (
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
          <span className={cx(CHIP_CLASS, "bg-pink")}>+{extraMinutes}分</span>
        </div>
        <p className="text-xs text-ink-soft">文章は写真とメモから Gemini が生成</p>
      </div>
      <Stamp className="mr-2 shrink-0">
        寄り道
        <br />
        達成
        <br />
        {CHECKPOINTS}/{CHECKPOINTS}
      </Stamp>
    </footer>
  </StickerCard>
);
