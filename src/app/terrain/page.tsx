import type { Metadata } from "next";
import TerrainCompare from "@/components/TerrainCompare";

export const metadata: Metadata = {
  title: "坂・日陰ルート比較 | 寄り道コンパス",
  description: "上野〜谷中の最短ルートと寄り道ルートを、坂と日陰で比較する。",
};

export default function TerrainPage() {
  // ダークモードの端末でも文字が読めるよう、このページは白背景に固定する
  return (
    <div className="min-h-screen bg-white">
      <TerrainCompare />
    </div>
  );
}
