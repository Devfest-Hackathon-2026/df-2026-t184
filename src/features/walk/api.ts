import { isQuestFailure, QuestFailure } from "@/lib/quests";

import { moodById, MOODS, type Quest } from "./content";
import { BUDGETS, CHECKPOINTS, type Budget, type Care, type MoodId } from "./flow";

export type QuestRequest = { dest: string; mood: MoodId; budget: Budget; care?: Care };

/** クエストを取ってくる。失敗・不正な応答なら null を返し、呼び出し側が見本に切り替える。 */
export type QuestFetcher = (request: QuestRequest, signal: AbortSignal) => Promise<readonly Quest[] | null>;

/** ブラウザが /api/quests を待つ上限。サーバーが Gemini を待つ上限（GEMINI_TIMEOUT_MS = 20 秒）より長くする。 */
const REQUEST_TIMEOUT_MS = 25_000;

/** クエストが取れたか、取れなかった原因か。原因は画面の知らせに使う。 */
export type QuestOutcome = { quests: readonly Quest[] } | { failure: QuestFailure };

export type QuestOutcomeFetcher = (request: QuestRequest, signal: AbortSignal) => Promise<QuestOutcome>;

type ApiQuest = { cp: string; title: string; why: string; s: [number, number, number] };

const isApiQuest = (v: unknown): v is ApiQuest => {
  const o = v as Partial<ApiQuest> | null;
  return (
    typeof o?.cp === "string" &&
    typeof o.title === "string" &&
    typeof o.why === "string" &&
    Array.isArray(o.s) &&
    o.s.length === 3 &&
    o.s.every((n) => typeof n === "number")
  );
};

/** /api/quests の応答を画面のクエストにする。色は同じ気分の見本から借りる。 */
export const toWalkQuests = (body: unknown, mood: MoodId): readonly Quest[] | null => {
  const list = (body as { quests?: unknown } | null)?.quests;
  if (!Array.isArray(list) || list.length !== CHECKPOINTS || !list.every(isApiQuest)) return null;
  const samples = moodById(mood).quests;
  return list.map((q, i) => ({ checkpoint: q.cp, title: q.title, why: q.why, tone: samples[i].tone, scores: q.s }));
};

// DOMException は実行環境によって Error を継承しないので、name だけで見分ける。
const isTimeout = (e: unknown): boolean => (e as { name?: unknown } | null)?.name === "TimeoutError";

/** 回数制限（src/lib/rate-limit.ts）で断られたときの HTTP ステータス。 */
const TOO_MANY_REQUESTS = 429;

/** サーバーの応答から原因を読む。読めなければ HTTP ステータスから決める。 */
const failureOf = async (res: Response): Promise<QuestFailure> => {
  const reason = await res
    .json()
    .then((body: unknown) => (body as { reason?: unknown } | null)?.reason)
    .catch(() => undefined);
  if (isQuestFailure(reason)) return reason;
  if (res.status === TOO_MANY_REQUESTS) return QuestFailure.RateLimited;
  return res.status === 504 ? QuestFailure.Timeout : QuestFailure.Upstream;
};

/** API は気分と時間を添字で受け取り、文言はサーバー側で決める。失敗しても投げず、原因を返す。 */
export const requestQuests: QuestOutcomeFetcher = async ({ dest, mood, budget, care }, signal) => {
  let res: Response;
  try {
    res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dest: dest.trim(),
        mood: MOODS.findIndex((m) => m.id === mood),
        budget: BUDGETS.indexOf(budget),
        ...(care?.slope || care?.shade ? { care } : {}),
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
  } catch (e) {
    const failure = isTimeout(e) ? QuestFailure.Timeout : QuestFailure.Network;
    console.warn("[quests] falling back to samples", failure);
    return { failure };
  }
  if (!res.ok) {
    const failure = await failureOf(res);
    console.warn("[quests] falling back to samples", failure, res.status);
    return { failure };
  }
  const quests = toWalkQuests(await res.json().catch(() => null), mood);
  if (!quests) {
    console.warn("[quests] falling back to samples", QuestFailure.InvalidOutput);
    return { failure: QuestFailure.InvalidOutput };
  }
  return { quests };
};

/** 失敗・不正な応答なら null を返す版。 */
export const fetchQuestsFromApi: QuestFetcher = async (request, signal) => {
  const outcome = await requestQuests(request, signal);
  return "quests" in outcome ? outcome.quests : null;
};
