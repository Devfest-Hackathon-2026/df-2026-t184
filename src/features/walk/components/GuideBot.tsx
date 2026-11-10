"use client";

import { useEffect, useState } from "react";

import { cx } from "@/components/sticker";

// 添付アイコンの配色（オレンジの髪・肌色の顔・斜めの目・ほっぺ）を、地図の矢印のような三角形に置き換えたキャラクター。
const COLORS = {
  body: "#f9a35f",
  shade: "#f38b4c",
  face: "#fcdcc0",
  eye: "#24252b",
  cheek: "#f9b2a2",
} as const;

const DEFAULT_SIZE = 72;
const TYPING_MS = 550;

type GuideBotProps = {
  /** 考え中は目を細めて、体をゆっくり揺らす。 */
  thinking?: boolean;
  size?: number;
  className?: string;
};

/** 寄り道を案内する三角のキャラクター。装飾なので読み上げない。 */
export const GuideBot = ({ thinking = false, size = DEFAULT_SIZE, className }: GuideBotProps): React.ReactElement => (
  <svg
    aria-hidden="true"
    viewBox="0 0 120 120"
    width={size}
    height={size}
    className={cx("shrink-0 overflow-visible drop-shadow-sm", thinking ? "animate-bot-think" : "animate-bot-idle", className)}
  >
    <path d="M58 6 C66 2 76 6 74 14 C72 20 64 20 62 15" fill="none" stroke={COLORS.shade} strokeWidth="6" strokeLinecap="round" />
    <path d="M60 12 C64 12 67 14 69 18 L111 96 C116 106 110 114 99 114 L21 114 C10 114 4 106 9 96 L51 18 C53 14 56 12 60 12 Z" fill={COLORS.body} />
    <path d="M30 70 C38 56 50 50 60 50 C70 50 82 56 90 70 L102 96 C105 103 101 108 94 108 L26 108 C19 108 15 103 18 96 Z" fill={COLORS.face} />
    <path d="M44 38 C52 30 68 30 76 38 L70 58 C66 50 54 50 50 58 Z" fill={COLORS.shade} />
    {thinking ? (
      <g stroke={COLORS.eye} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M40 80 q6 -5 12 0" />
        <path d="M68 80 q6 -5 12 0" />
      </g>
    ) : (
      <g fill={COLORS.eye}>
        <rect x="42" y="68" width="8" height="20" rx="4" transform="rotate(20 46 78)" />
        <rect x="70" y="68" width="8" height="20" rx="4" transform="rotate(20 74 78)" />
      </g>
    )}
    <ellipse cx="34" cy="94" rx="8" ry="5" fill={COLORS.cheek} />
    <ellipse cx="88" cy="94" rx="8" ry="5" fill={COLORS.cheek} />
  </svg>
);

type BotSaysProps = {
  /** 吹き出しの言葉。変わるたびに「…」を一瞬見せてから出す。 */
  text: string;
  /** ずっと「…」のまま考え続ける。 */
  thinking?: boolean;
  className?: string;
};

const TypingDots = (): React.ReactElement => (
  <span className="inline-flex gap-1 py-1.5" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <span key={i} className="size-1.5 animate-typing-dot rounded-full bg-ink-soft" style={{ animationDelay: `${i * 150}ms` }} />
    ))}
  </span>
);

/** 右下のキャラクターと、その左の吹き出し。言葉は読み上げ用に別で置くので、ここは見た目だけ。 */
export const BotSays = ({ text, thinking = false, className }: BotSaysProps): React.ReactElement => {
  const [shown, setShown] = useState<string | null>(null);

  // 言葉が変わったら少し「考えて」から出す（表示の時計との同期なので effect）。
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(text), TYPING_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  const typing = thinking || shown !== text;
  return (
    <div aria-hidden="true" className={cx("flex items-end justify-end gap-2", className)}>
      <p className="relative mb-6 max-w-[16rem] rounded-2xl rounded-br-sm border border-line bg-surface-raised px-4 py-2.5 font-hand text-base leading-snug text-ink shadow-sticker">
        {typing ? <TypingDots /> : <span className="animate-pop-in">{text}</span>}
      </p>
      <GuideBot thinking={typing} />
    </div>
  );
};
