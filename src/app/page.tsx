import { redirect } from "next/navigation";

// 入口は /walk の体験（F02）。旧 YorimichiApp（src/components/YorimichiApp.tsx）は削除せず、ルートから外しただけ。
// 恒久的な 308 ではなく一時的な 307 にして、入口を戻す・変える余地を残す（docs/DECISIONS.md D-F02）。
export default function Home(): never {
  redirect("/walk");
}
