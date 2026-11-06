import { Hachi_Maru_Pop, Yomogi } from "next/font/google";

// 見出しとボタンは Hachi Maru Pop、本文は Yomogi。日本語のグリフは分割配信なので preload しない。
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

export const fontVariables = `${handFont.variable} ${noteFont.variable}`;
