import { NextResponse } from "next/server";
import { ERROR_TEXT, generateQuests } from "@/lib/quest-generation";
import { questsLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { vertexFromEnv } from "@/lib/vertex-server";

// 気分・目的地・寄り道時間から、チェックポイント3つとクエストを Gemini で作る。
// Vertex AI 経由で呼ぶ（認証は実行環境の ADC）。IP ごとの回数制限あり（超過で 429、src/lib/rate-limit.ts）。
// 失敗したら { error, reason }（reason は QuestFailure）を返し、原因はサーバーログに残す（src/lib/quest-generation.ts）。

// 気分と時間はインデックスで受け取り、文言はサーバー側で決める（クライアントの文字列を信用しない）。
// 文言は src/components/YorimichiApp.tsx の MOODS と揃えること。
const MOODS = [
  { label: "静けさ優先", desc: "人の少ない路地や小道を選ぶ" },
  { label: "レトロ・ノスタルジック", desc: "古い看板や昔ながらの店をめぐる" },
  { label: "ローカルグルメ", desc: "地元の人が通う小さな店に寄る" },
];
const EXTRA = [8, 14, 23];

export async function POST(req: Request) {
  const limited = rateLimitResponse(questsLimiter, req, "quests");
  if (limited) return limited;

  let body: { dest?: unknown; mood?: unknown; budget?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const dest = typeof body.dest === "string" ? body.dest.trim().replace(/[<>]/g, "") : "";
  const mood = MOODS[Number(body.mood)];
  const extra = EXTRA[Number(body.budget)];
  if (!dest || dest.length > 60 || !mood || !extra) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const result = await generateQuests(vertexFromEnv(), { dest, moodLabel: mood.label, moodDesc: mood.desc, extraMin: extra });
  if (!result.ok) return NextResponse.json({ error: ERROR_TEXT[result.failure], reason: result.failure }, { status: result.status });
  return NextResponse.json({ quests: result.quests });
}
