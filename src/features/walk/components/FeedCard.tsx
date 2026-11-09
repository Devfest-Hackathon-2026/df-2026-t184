"use client";

import { useState } from "react";

import { cx, IconName, IconSticker, StickerCard, TONE_FILL, Tone } from "@/components/sticker";

import { type FeedPost, moodById } from "../content";

const LIKE_ICON_SIZE = 28;

type FeedCardProps = { post: FeedPost };

/** ともだちの思い出カード。頭文字のアイコンとひとこと、いいねだけの小さな投稿。 */
export const FeedCard = ({ post }: FeedCardProps): React.ReactElement => {
  const [liked, setLiked] = useState(false);
  const likeCount = post.likes + (liked ? 1 : 0);
  const mood = moodById(post.moodId);
  return (
    <StickerCard className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cx("grid size-11 shrink-0 place-items-center rounded-full font-hand text-lg text-ink", TONE_FILL[post.tone])}
        >
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
        <span className={cx("rounded-(--radius-chip) border border-line px-2 py-0.5 font-hand text-xs text-ink", TONE_FILL[mood.tone])}>{mood.label}</span>
        <button
          type="button"
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
          className={cx(
            "inline-flex min-h-12 items-center gap-2 rounded-full border border-line px-3 font-hand text-base text-ink",
            "transition-[background-color] duration-150 ease-out",
            "focus-visible:focus-ring",
            liked ? "bg-pink" : "bg-sticker hover:bg-paper",
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
