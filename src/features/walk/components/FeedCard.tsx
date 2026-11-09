"use client";

import { useState } from "react";

import { cx, IconName, IconSticker, TONE_FILL } from "@/components/sticker";

import { type FeedPost, moodById } from "../content";

const ACTION_ICON_SIZE = 32;
const ACTION_CLASS =
  "inline-flex min-h-10 items-center gap-2 rounded-full px-3 font-note text-sm text-ink-soft transition-colors hover:bg-paper focus-visible:focus-ring";

type FeedCardProps = { post: FeedPost };

/**
 * ともだちの寄り道ログ 1 件。番号付きの立ち寄り先と道順で、歩いた流れを見せる。
 * 下に、いいね・コメント・共有を横に並べる。
 */
export const FeedCard = ({ post }: FeedCardProps): React.ReactElement => {
  const [liked, setLiked] = useState(false);
  const likeCount = post.likes + (liked ? 1 : 0);
  const mood = moodById(post.moodId);
  return (
    <article className="flex flex-col gap-4 rounded-(--radius-sticker) bg-sticker p-4 shadow-sticker">
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className={cx("grid size-10 shrink-0 place-items-center rounded-full font-note text-base font-semibold text-ink", TONE_FILL[post.tone])}>
          {post.author.slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-note text-sm font-semibold text-ink">{post.author}</p>
          <p className="font-note text-xs text-ink-soft">
            {post.walkedOn}・<span className="tabular-nums">{post.time}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-paper px-3 py-1 font-note text-xs text-ink-soft">{mood.label.replace("優先", "")}</span>
      </header>

      <section aria-label={`${post.dest}への寄り道ルート`} className="flex flex-col gap-3 rounded-2xl bg-paper p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-note text-xs text-ink-soft">寄り道ルート</span>
          <span className="font-note text-xs tabular-nums text-ink-soft">+{post.extraMinutes}分</span>
        </div>
        <ol className="flex flex-col">
          {mood.quests.map((quest, i) => (
            <li key={quest.checkpoint} className="relative flex min-h-11 items-center gap-3">
              {i < mood.quests.length - 1 && <span aria-hidden="true" className="absolute top-7 bottom-[-0.5rem] left-[0.6875rem] border-l border-dashed border-ink/20" />}
              <span aria-hidden="true" className={cx("relative z-10 grid size-6 shrink-0 place-items-center rounded-full font-note text-xs font-semibold text-ink", TONE_FILL[quest.tone])}>
                {i + 1}
              </span>
              <span className="font-note text-sm text-ink">{quest.checkpoint}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-1">
        <p className="font-note text-base font-semibold text-ink">{post.dest}へ、少し遠回り</p>
        <p className="font-note text-sm leading-relaxed text-ink">{post.excerpt}</p>
      </div>

      <footer className="flex items-center gap-1 border-t border-ink/10 pt-2">
        <button type="button" aria-pressed={liked} onClick={() => setLiked((v) => !v)} className={ACTION_CLASS}>
          <IconSticker name={IconName.Heart} size={ACTION_ICON_SIZE} bg={liked ? "bg-accent" : "bg-paper"} />
          <span className="sr-only">いいね</span>
          {likeCount}
        </button>
        <button type="button" aria-label={`コメント ${post.comments}件`} className={ACTION_CLASS}>
          <IconSticker name={IconName.Comment} size={ACTION_ICON_SIZE} bg="bg-paper" />
          <span aria-hidden="true">{post.comments}</span>
        </button>
        <button type="button" aria-label={`${post.author}の寄り道を共有`} className={cx(ACTION_CLASS, "ml-auto")}>
          <IconSticker name={IconName.Share} size={ACTION_ICON_SIZE} bg="bg-paper" />
          <span className="sr-only">共有</span>
        </button>
      </footer>
    </article>
  );
};
