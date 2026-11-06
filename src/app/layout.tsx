import type { Metadata } from "next";

import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "寄り道コンパス",
  description: "最短じゃない道で、まだ知らない街へ。混雑を避けた裏道と、ちいさなクエストで寄り道する散歩アプリ。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
