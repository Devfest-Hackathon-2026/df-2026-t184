// クライアント・サーバー共通の型と、Gemini の出力の検証。

export type Quest = {
  cp: string;
  title: string;
  why: string;
  s: [number, number, number]; // 静けさ / レトロ度 / ローカル感
};

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n)) || 0));
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Gemini の出力を信用せず、形と長さを整えてから使う。不正なら null。
export function parseQuests(raw: unknown): Quest[] | null {
  const list = (raw as { quests?: unknown })?.quests;
  if (!Array.isArray(list) || list.length < 3) return null;
  const out: Quest[] = [];
  for (const item of list.slice(0, 3)) {
    const o = item as Record<string, unknown>;
    const scores = (o?.scores ?? {}) as Record<string, unknown>;
    const q: Quest = {
      cp: str(o?.cp, 30),
      title: str(o?.title, 60),
      why: str(o?.why, 120),
      s: [clamp(scores.quiet), clamp(scores.retro), clamp(scores.local)],
    };
    if (!q.cp || !q.title || !q.why) return null;
    out.push(q);
  }
  return out;
}

/** /api/quests が見本に切り替える原因。サーバーの応答とログ、画面の知らせで共通に使う。 */
export enum QuestFailure {
  /** Gemini（またはブラウザからの通信）が時間内に返らなかった。 */
  Timeout = "timeout",
  /** Gemini は返したが、JSON として読めない・形が違う。 */
  InvalidOutput = "invalid_output",
  /** Gemini が 4xx/5xx を返した、または通信に失敗した。 */
  Upstream = "upstream",
  /** Vertex AI の認証情報を取れない、またはプロジェクトが設定されていない。 */
  Config = "config",
  /** ブラウザから /api/quests に届かなかった。 */
  Network = "network",
  /** 同じ IP からの呼び出しが多すぎて、サーバーが 429 で断った（src/lib/rate-limit.ts）。 */
  RateLimited = "rate_limited",
}

const FAILURES: ReadonlySet<string> = new Set(Object.values(QuestFailure));

export const isQuestFailure = (v: unknown): v is QuestFailure => typeof v === "string" && FAILURES.has(v);
