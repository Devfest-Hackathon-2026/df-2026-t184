"use client";

import { useState } from "react";

import { cx, IconName, IconSticker, StickerCard, Tape, Tilt, TONE_DEEP_FILL, TONE_FILL, Tone } from "@/components/sticker";

import { type FeedPost, moodById } from "../content";

const LIKE_ICON_SIZE = 28;
const AVATAR_TILT_DEG = 6;
const TAPE_ANGLE_LEFT = -9;
const TAPE_ANGLE_RIGHT = 7;

type FeedCardProps = { post: FeedPost; tilt: Tilt };

/** ともだちの思い出カード。頭文字のシールとひとこと、いいねだけの小さな投稿。 */
export const FeedCard = ({ post, tilt }: FeedCardProps): React.ReactElement => {
  const [liked, setLiked] = useState(false);
  const likeCount = post.likes + (liked ? 1 : 0);
  const mood = moodById(post.moodId);
  const tapeOnRight = tilt !== Tilt.Right;
  return (
    <StickerCard tilt={tilt} className="flex flex-col gap-3 pt-7">
      <Tape tone={post.tone} angle={tapeOnRight ? TAPE_ANGLE_RIGHT : TAPE_ANGLE_LEFT} className={tapeOnRight ? "-top-3 right-6" : "-top-3 left-6"} />

      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          style={{ rotate: `${tapeOnRight ? -AVATAR_TILT_DEG : AVATAR_TILT_DEG}deg` }}
          className={cx("sticker-fringe relative grid size-12 shrink-0 place-items-center rounded-full border-3 border-ink font-hand text-xl text-ink", TONE_FILL[post.tone])}
        >
          <span className={cx("absolute -top-2 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-xs border-2 border-ink", TONE_DEEP_FILL[post.tone])} />
          {post.author.slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="font-hand text-base text-ink">{post.author}</p>
          <p className="text-xs text-ink-soft">{post.walkedOn}</p>
        </div>
      </header>

      <p className="font-hand text-lg leading-snug text-ink">
        {post.dest}
        <span className="ml-2 rounded-sm bg-pink px-1 text-sm">+{post.extraMinutes}分</span>
      </p>
      <p className="font-note text-base leading-relaxed text-ink">{post.excerpt}</p>

      <footer className="flex items-center justify-between gap-3">
        <span className={cx("rounded-(--radius-chip) border-2 border-ink px-2 py-0.5 font-hand text-xs text-ink", TONE_FILL[mood.tone])}>{mood.label}</span>
        <button
          type="button"
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
          className={cx(
            "inline-flex min-h-12 items-center gap-2 rounded-full border-3 border-ink px-3 font-hand text-base text-ink",
            "transition-[transform,box-shadow,background-color] duration-150 ease-out active:animate-jelly",
            "focus-visible:focus-ring",
            liked ? "bg-pink shadow-sticker-sm" : "bg-sticker shadow-pressed hover:shadow-sticker-sm",
          )}
        >
          <IconSticker name={IconName.Heart} tone={liked ? Tone.Pink : Tone.Lemon} size={LIKE_ICON_SIZE} />
          <span className="sr-only">いいね</span>
          {likeCount}
        </button>
      </footer>
    </StickerCard>
  );
};
