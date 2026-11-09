import { moodById, MOODS, type Quest } from "./content";
import { BUDGETS, CHECKPOINTS, type Budget, type MoodId } from "./flow";

export type QuestRequest = { dest: string; mood: MoodId; budget: Budget };

/** クエストを取ってくる。失敗・不正な応答なら null を返し、呼び出し側が見本に切り替える。 */
export type QuestFetcher = (request: QuestRequest, signal: AbortSignal) => Promise<readonly Quest[] | null>;

const REQUEST_TIMEOUT_MS = 25_000;

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

/** API は気分と時間を添字で受け取り、文言はサーバー側で決める。 */
export const fetchQuestsFromApi: QuestFetcher = async ({ dest, mood, budget }, signal) => {
  try {
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dest: dest.trim(),
        mood: MOODS.findIndex((m) => m.id === mood),
        budget: BUDGETS.indexOf(budget),
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
    return res.ok ? toWalkQuests(await res.json(), mood) : null;
  } catch {
    return null;
  }
};
