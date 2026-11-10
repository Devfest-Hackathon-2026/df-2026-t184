// /api/quests の中身。Gemini を呼び、失敗したら原因（QuestFailure）を分けて返し、ログに残す。
// route.ts から切り出したのは、Vertex AI のクライアントを差し替えて単体テストするため。

import { buildQuestPrompt, QUEST_SYSTEM_INSTRUCTION } from "./prompts/quests";
import { RATE_LIMIT_TEXT } from "./rate-limit";
import { parseQuests, QuestFailure, type Quest } from "./quests";
import { VertexAuthError, type VertexClient } from "./vertex";

/** Gemini を待つ上限。ブラウザ側の待ち時間（src/features/walk/api.ts の 25 秒）より短くして、
 *  時間切れをサーバーが原因つきで返せるようにする。 */
export const GEMINI_TIMEOUT_MS = 20_000;

/** ログに出す Gemini の応答本文の上限（文字数）。応答にキーは含まれない。 */
const LOG_DETAIL_MAX = 300;

export type QuestInput = { dest: string; moodLabel: string; moodDesc: string; extraMin: number };

export type QuestResult =
  | { ok: true; quests: Quest[] }
  | { ok: false; failure: QuestFailure; status: number };

/** ログの書き出し先。テストで差し替える。 */
export type QuestLogger = { info: (msg: string, data: object) => void; error: (msg: string, data: object) => void };

const consoleLogger: QuestLogger = {
  info: (msg, data) => console.info(msg, JSON.stringify(data)),
  error: (msg, data) => console.error(msg, JSON.stringify(data)),
};

/** 失敗の原因ごとの HTTP ステータス。時間切れは 504、上流の失敗・不正な出力は 502、設定・認証は 500。 */
export const STATUS_OF: Record<QuestFailure, number> = {
  [QuestFailure.Timeout]: 504,
  [QuestFailure.InvalidOutput]: 502,
  [QuestFailure.Upstream]: 502,
  [QuestFailure.Config]: 500,
  [QuestFailure.Network]: 502,
  [QuestFailure.RateLimited]: 429,
};

/** 応答の error に入れる説明（調整ページ PromptLab がそのまま表示する）。 */
export const ERROR_TEXT: Record<QuestFailure, string> = {
  [QuestFailure.Timeout]: "Gemini の応答が時間内に届きませんでした",
  [QuestFailure.InvalidOutput]: "Gemini の応答の形が正しくありませんでした",
  [QuestFailure.Upstream]: "Gemini の呼び出しに失敗しました",
  [QuestFailure.Config]: "Vertex AI の設定または認証に失敗しました",
  [QuestFailure.Network]: "通信に失敗しました",
  [QuestFailure.RateLimited]: RATE_LIMIT_TEXT,
};

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

// DOMException は実行環境によって Error を継承しないので、name だけで見分ける。
const isTimeout = (e: unknown): boolean => (e as { name?: unknown } | null)?.name === "TimeoutError";

const describeError = (e: unknown): string => {
  const o = e as { name?: unknown; message?: unknown } | null;
  return (typeof o?.message === "string" ? `${String(o.name)}: ${o.message}` : String(e)).slice(0, LOG_DETAIL_MAX);
};

type Options = { timeoutMs?: number; log?: QuestLogger; now?: () => number };

export const generateQuests = async (
  vertex: VertexClient | null,
  input: QuestInput,
  { timeoutMs = GEMINI_TIMEOUT_MS, log = consoleLogger, now = Date.now }: Options = {},
): Promise<QuestResult> => {
  const fail = (failure: QuestFailure, detail: object): QuestResult => {
    log.error("[quests] failed", { reason: failure, ...detail });
    return { ok: false, failure, status: STATUS_OF[failure] };
  };

  if (!vertex) return fail(QuestFailure.Config, { detail: "Vertex AI のプロジェクトが設定されていません" });

  const started = now();
  const elapsed = () => ({ model: vertex.model, elapsedMs: now() - started });

  let res: Response;
  try {
    res = await vertex.generateContent(
      {
        systemInstruction: { parts: [{ text: QUEST_SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: buildQuestPrompt(input) }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.8 },
      },
      { signal: AbortSignal.timeout(timeoutMs) },
    );
  } catch (e) {
    if (e instanceof VertexAuthError) return fail(QuestFailure.Config, { ...elapsed(), detail: describeError(e.cause ?? e) });
    if (isTimeout(e)) return fail(QuestFailure.Timeout, { ...elapsed(), timeoutMs });
    return fail(QuestFailure.Upstream, { ...elapsed(), detail: describeError(e) });
  }

  let raw: string;
  try {
    raw = await res.text();
  } catch (e) {
    if (isTimeout(e)) return fail(QuestFailure.Timeout, { ...elapsed(), timeoutMs });
    return fail(QuestFailure.Upstream, { ...elapsed(), status: res.status, detail: describeError(e) });
  }

  if (!res.ok) return fail(QuestFailure.Upstream, { ...elapsed(), status: res.status, detail: raw.slice(0, LOG_DETAIL_MAX) });

  let quests: Quest[] | null = null;
  try {
    const text = JSON.parse(raw)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    quests = parseQuests(JSON.parse(text));
  } catch {
    quests = null;
  }
  if (!quests) return fail(QuestFailure.InvalidOutput, { ...elapsed(), detail: raw.slice(0, LOG_DETAIL_MAX) });

  log.info("[quests] ok", elapsed());
  return { ok: true, quests };
};
