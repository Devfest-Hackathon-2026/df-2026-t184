"use client";

import { useEffect, useState } from "react";

import { cx, Stamp, StickerCard } from "@/components/sticker";

import { pointBreakdown, POINTS_NOT_SAVED_NOTE, walkPoints, type WalkRecord } from "../points";

// ハンコが押されてから数え始めるまでの間と、数え上げにかける時間。
const COUNT_DELAY_MS = 350;
const COUNT_MS = 900;
// 内訳の行を 1 行ずつずらして出す間隔と、最初の行が出るまでの間。
const LINE_STEP_MS = 140;
const LINE_DELAY_MS = 500;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

// 終わりに向けてゆっくりになる（弾まない）。
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** 0 から target まで数え上げた今の値。animate が false なら最初から target。 */
const useCountUp = (target: number, animate: boolean): number => {
  const [value, setValue] = useState(() => (animate && !prefersReducedMotion() ? 0 : target));

  // 数え上げは画面の描画（外部の時計）との同期なので effect で進める。
  useEffect(() => {
    if (!animate || prefersReducedMotion()) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number): void => {
      start ??= now;
      const t = Math.min(Math.max(now - start - COUNT_DELAY_MS, 0) / COUNT_MS, 1);
      setValue(Math.round(target * easeOut(t)));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animate, target]);

  return animate ? value : target;
};

type FinishScoreProps = {
  record: WalkRecord;
  /** 歩き終えた直後だけ演出する。タブから戻ったときは止まった状態で出す。 */
  celebrate: boolean;
};

/** 歩き終えたときのスコア。ハンコを押し、ポイントを数え上げ、内訳を順に出す。 */
export const FinishScore = ({ record, celebrate }: FinishScoreProps): React.ReactElement => {
  const total = walkPoints(record);
  const shown = useCountUp(total, celebrate);
  const lines = pointBreakdown(record);

  return (
    <StickerCard className="flex flex-col items-center gap-3 p-5 text-center">
      <section aria-labelledby="finish-heading" className="flex w-full flex-col items-center gap-3">
        <Stamp className={cx("size-20 text-base", celebrate && "animate-stamp-in")}>
          <span id="finish-heading" role="heading" aria-level={2}>
            ゴール！
          </span>
        </Stamp>

        <p data-testid="score-counter" aria-hidden="true" className="font-hand text-5xl tabular-nums text-ink">
          +{shown}
          <span className="ml-1 text-2xl">pt</span>
        </p>
        <p className="sr-only">この寄り道で +{total} pt</p>

        <ul aria-label="ポイントの内訳" className="flex w-full flex-col gap-1">
          {lines.map((l, i) => (
            <li
              key={l.label}
              className={cx("flex justify-between font-note text-sm text-ink", celebrate && "animate-rise")}
              style={celebrate ? { animationDelay: `${LINE_DELAY_MS + i * LINE_STEP_MS}ms` } : undefined}
            >
              <span>{l.label}</span>
              <span className="font-hand">+{l.points}</span>
            </li>
          ))}
        </ul>

        <p className="font-note text-xs text-ink-soft">
          ハンコ帳で称号を見られます
          <span className="block">{POINTS_NOT_SAVED_NOTE}</span>
        </p>
      </section>
    </StickerCard>
  );
};
