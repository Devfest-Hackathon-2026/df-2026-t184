import { Hachi_Maru_Pop, Yomogi, Zen_Kaku_Gothic_New } from "next/font/google";

// 見出しとボタンは Hachi Maru Pop、本文は Yomogi。日本語のグリフは分割配信なので preload しない。
// 実アプリ（YorimichiApp）は var(--font-zen) を参照するため Zen Kaku Gothic New も残す。
export const zenFont = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
});

export const handFont = Hachi_Maru_Pop({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-hand-face",
});

export const noteFont = Yomogi({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-note-face",
});

export const fontVariables = `${handFont.variable} ${noteFont.variable} ${zenFont.variable}`;
