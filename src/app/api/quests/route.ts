import { NextResponse } from "next/server";
import { buildQuestPrompt, QUEST_SYSTEM_INSTRUCTION } from "@/lib/prompts/quests";
import { parseQuests } from "@/lib/quests";
import { VertexAuthError } from "@/lib/vertex";
import { vertexFromEnv } from "@/lib/vertex-server";

// 気分・目的地・寄り道時間から、チェックポイント3つとクエストを Gemini で作る。
// Vertex AI 経由で呼ぶ（認証は実行環境の ADC）。本番では認証・レート制限を付けること。

// 気分と時間はインデックスで受け取り、文言はサーバー側で決める（クライアントの文字列を信用しない）。
// 文言は src/components/YorimichiApp.tsx の MOODS と揃えること。
const MOODS = [
  { label: "静けさ優先", desc: "人の少ない路地や小道を選ぶ" },
  { label: "レトロ・ノスタルジック", desc: "古い看板や昔ながらの店をめぐる" },
  { label: "ローカルグルメ", desc: "地元の人が通う小さな店に寄る" },
];
const EXTRA = [8, 14, 23];

const SCHEMA = {
  type: "OBJECT",
  properties: {
    quests: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          cp: { type: "STRING", description: "地図で検索できる場所の名称" },
          title: { type: "STRING", description: "その場でできる小さな行動" },
          why: { type: "STRING", description: "なぜこの道か（穏やかな説明）" },
          scores: {
            type: "OBJECT",
            properties: {
              quiet: { type: "INTEGER" },
              retro: { type: "INTEGER" },
              local: { type: "INTEGER" },
            },
            required: ["quiet", "retro", "local"],
          },
        },
        required: ["cp", "title", "why", "scores"],
      },
    },
  },
  required: ["quests"],
};

export async function POST(req: Request) {
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

  const vertex = vertexFromEnv();
  if (!vertex) {
    return NextResponse.json({ error: "Vertex AI のプロジェクトが設定されていません" }, { status: 500 });
  }

  try {
    const res = await vertex.generateContent(
      {
        systemInstruction: { parts: [{ text: QUEST_SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: "user",
            parts: [{ text: buildQuestPrompt({ dest, moodLabel: mood.label, moodDesc: mood.desc, extraMin: extra }) }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.8 },
      },
      { signal: AbortSignal.timeout(20_000) },
    );
    if (!res.ok) {
      console.error("gemini error", res.status, (await res.text()).slice(0, 500));
      return NextResponse.json({ error: "Gemini request failed" }, { status: 502 });
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const quests = parseQuests(JSON.parse(text));
    if (!quests) return NextResponse.json({ error: "unexpected output" }, { status: 502 });
    return NextResponse.json({ quests });
  } catch (e) {
    if (e instanceof VertexAuthError) {
      console.error(e.message, e.cause);
      return NextResponse.json({ error: "Vertex AI の認証に失敗しました" }, { status: 500 });
    }
    console.error("quests failed", e);
    return NextResponse.json({ error: "Gemini request failed" }, { status: 502 });
  }
}
