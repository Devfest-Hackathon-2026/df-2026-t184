import type { Metadata } from "next";

import { WalkApp } from "@/features/walk/WalkApp";

export const metadata: Metadata = {
  title: "寄り道コンパス（新デザイン）",
};

// 新デザインの画面。Gemini のクエストと Google Maps の地図を使い、キーがなければ見本と手描き地図で動く。
// / はここへ移る（src/app/page.tsx）。旧 YorimichiApp は src/components に残してある。
export default function WalkPage() {
  return (
    <div className="font-note text-ink">
      <WalkApp live onboarding />
    </div>
  );
}
