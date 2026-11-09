import { M_PLUS_1_Code, Zen_Kaku_Gothic_New } from "next/font/google";

// 画面の文字は等幅の M PLUS 1 Code（setlog の作成画面のような、打ち込んだ文字の雰囲気）。
// 実アプリ（YorimichiApp）は var(--font-zen) を参照するため Zen Kaku Gothic New も残す。日本語のグリフは分割配信なので preload しない。
export const zenFont = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
});

export const codeFont = M_PLUS_1_Code({
  variable: "--font-code",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export const fontVariables = `${codeFont.variable} ${zenFont.variable}`;
