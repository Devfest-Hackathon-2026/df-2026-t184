import { NextResponse } from "next/server";

import { VertexAuthError } from "@/lib/vertex";
import { vertexFromEnv } from "@/lib/vertex-server";

// Gemini 呼び出しのサンプル。Vertex AI 経由で、認証は実行環境の ADC（クライアントに鍵を渡さない）。
// 本番では認証・レート制限を必ず付けること。
export async function POST(req: Request) {
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const vertex = vertexFromEnv();
  if (!vertex) {
    return NextResponse.json({ error: "Vertex AI のプロジェクトが設定されていません" }, { status: 500 });
  }
  let res: Response;
  try {
    res = await vertex.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
  } catch (e) {
    if (e instanceof VertexAuthError) {
      console.error(e.message, e.cause);
      return NextResponse.json({ error: "Vertex AI の認証に失敗しました" }, { status: 500 });
    }
    throw e;
  }
  if (!res.ok) {
    console.error("gemini error", res.status, (await res.text()).slice(0, 500));
    return NextResponse.json({ error: "Gemini request failed" }, { status: 502 });
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return NextResponse.json({ text });
}
