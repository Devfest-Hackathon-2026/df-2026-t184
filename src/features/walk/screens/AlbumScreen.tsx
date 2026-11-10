"use client";

import { useState } from "react";

import { cx, IconName, IconSticker, ScreenHeading, StickerCard, TONE_FILL } from "@/components/sticker";

import { MemoryCard } from "../components/MemoryCard";
import { PhotoArt } from "../components/PhotoSlot";
import { moodById, type AlbumEntry } from "../content";

const BACK_ICON_SIZE = 44;

type AlbumScreenProps = { album: readonly AlbumEntry[] };

/** 開いた 1 件の思い出カード。 */
const AlbumDetail = ({ entry, onBack }: { entry: AlbumEntry; onBack: () => void }): React.ReactElement => (
  <div className="flex flex-col gap-5 p-5">
    <header className="flex items-center gap-3">
      <button
        type="button"
        aria-label="アルバムに戻る"
        onClick={onBack}
        className="shrink-0 rounded-full transition-transform duration-150 ease-out active:translate-x-0.5 active:translate-y-0.5 focus-visible:focus-ring"
      >
        <IconSticker name={IconName.Back} size={BACK_ICON_SIZE} />
      </button>
      <ScreenHeading className="font-hand text-xl text-ink">{entry.walkedOn}の思い出</ScreenHeading>
    </header>
    <MemoryCard
      dest={entry.dest}
      mood={moodById(entry.mood)}
      quests={entry.quests}
      shots={[...entry.shots]}
      memos={[...entry.memos]}
      extraMinutes={entry.extraMinutes}
      walkedOn={entry.walkedOn}
    />
  </div>
);

/** これまでの寄り道を、新しい順のタイムラインで並べる画面。 */
export const AlbumScreen = ({ album }: AlbumScreenProps): React.ReactElement => {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = album.find((e) => e.id === openId);
  if (opened) return <AlbumDetail entry={opened} onBack={() => setOpenId(null)} />;

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-col gap-1">
        <ScreenHeading className="font-hand text-2xl text-ink">寄り道アルバム</ScreenHeading>
        <p className="text-xs text-ink-soft">{album.length} 回の寄り道。見本の記録もまざっています</p>
      </header>

      <div className="flex items-center gap-3">
        <p className="font-note text-sm text-fg-subtle">どの寄り道から見返す？</p>
      </div>

      <ul className="relative flex flex-col gap-5 border-l border-dashed border-line pl-5">
        {album.map((entry) => {
          const mood = moodById(entry.mood);
          const firstShot = entry.shots.findIndex(Boolean);
          const cover = entry.quests[Math.max(firstShot, 0)];
          return (
            <li key={entry.id} className="relative">
              <span aria-hidden="true" className={cx("absolute top-6 -left-[1.95rem] size-4 rounded-full border border-line", TONE_FILL[mood.tone])} />
              <button
                type="button"
                aria-label={`${entry.walkedOn} ${entry.dest}の思い出を開く（${mood.label}・+${entry.extraMinutes}分・写真 ${entry.shots.filter(Boolean).length} 枚）`}
                onClick={() => setOpenId(entry.id)}
                className="block w-full text-left rounded-3xl focus-visible:focus-ring">
                <StickerCard className="flex gap-3 p-3 transition-transform duration-150 ease-out hover:-translate-y-0.5">
                  <div className="w-20 shrink-0 border border-line bg-sticker p-1 shadow-sticker-sm">
                    <PhotoArt tone={cover.tone} label={`${cover.checkpoint}の写真（見本）`} className="aspect-square" />
                  </div>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-hand text-xs text-ink-soft">{entry.walkedOn}</span>
                    <span className="font-hand text-lg leading-snug text-ink">{entry.dest}</span>
                    <span className="font-note text-xs text-ink-soft">
                      {mood.label}・+{entry.extraMinutes}分・写真 {entry.shots.filter(Boolean).length} 枚
                    </span>
                  </span>
                </StickerCard>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
