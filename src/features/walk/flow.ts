import type { QuestFailure } from "@/lib/quests";

import type { Quest } from "./content";

export enum MoodId {
  Quiet = "quiet",
  Retro = "retro",
  Local = "local",
}

export enum Screen {
  Input = "input",
  Loading = "loading",
  Route = "route",
  Capture = "capture",
  Memory = "memory",
}

export enum QuestSource {
  Sample = "sample",
  Ai = "ai",
  /** AI が失敗したので見本で代わりにした。画面で知らせる。 */
  Fallback = "fallback",
}

export type QuestPlan = {
  source: QuestSource;
  quests: readonly Quest[];
  /** source が Fallback のときの、AI が使えなかった原因。 */
  failure?: QuestFailure;
};

export type Budget = 10 | 20 | 30;

/** 歩きやすさの希望。坂を少なめにしたい・日陰を通りたい。どちらも任意。 */
export type Care = { slope: boolean; shade: boolean };
export const NO_CARE: Care = { slope: false, shade: false };
export const BUDGETS: readonly Budget[] = [10, 20, 30];

export const CHECKPOINTS = 3;
const SHORTEST_MIN = 18;
const EXTRA_BY_BUDGET: Record<Budget, number> = { 10: 8, 20: 14, 30: 23 };

export const LOADING_STAGES = [
  { label: "近くのスポットを集める", api: "Places API" },
  { label: "口コミから気分に合う場所を選ぶ", api: "Gemini" },
  { label: "人の少ない道でルートを引く", api: "Routes API" },
  { label: "地点ごとにクエストを作る", api: "Gemini" },
] as const;

export type WalkState = {
  screen: Screen;
  dest: string;
  mood: MoodId;
  budget: Budget;
  care: Care;
  stage: number;
  step: number;
  shots: boolean[];
  memos: string[];
  /** このルートのクエスト。null の間は探索の結果待ち。 */
  plan: QuestPlan | null;
  /** 地図が出発地から目的地への順に並べ替えたときの、plan.quests の添字の並び。 */
  order: readonly number[] | null;
};

export type WalkAction =
  | { type: "setDest"; dest: string }
  | { type: "pickMood"; mood: MoodId }
  | { type: "pickBudget"; budget: Budget }
  | { type: "setCare"; key: keyof Care; on: boolean }
  | { type: "start" }
  | { type: "advanceStage" }
  | { type: "receivePlan"; plan: QuestPlan }
  | { type: "reorder"; order: readonly number[] }
  | { type: "found" }
  | { type: "openCapture" }
  | { type: "backToRoute" }
  | { type: "backToInput" }
  | { type: "shoot" }
  | { type: "setMemo"; memo: string }
  | { type: "saveAndNext" }
  | { type: "restart" };

const emptyRecords = (): Pick<WalkState, "shots" | "memos"> => ({
  shots: Array<boolean>(CHECKPOINTS).fill(false),
  memos: Array<string>(CHECKPOINTS).fill(""),
});

export const initialWalk: WalkState = {
  screen: Screen.Input,
  dest: "",
  mood: MoodId.Quiet,
  budget: 20,
  care: NO_CARE,
  stage: 0,
  step: 0,
  ...emptyRecords(),
  plan: null,
  order: null,
};

export type Eta = { shortest: number; extra: number; total: number };

export const eta = (budget: Budget): Eta => {
  const extra = EXTRA_BY_BUDGET[budget];
  return { shortest: SHORTEST_MIN, extra, total: SHORTEST_MIN + extra };
};

const replaceAt = <T,>(list: T[], index: number, value: T): T[] =>
  list.map((item, i) => (i === index ? value : item));

// 演出をすべて見せ終え、かつクエストが届いたときだけ地図へ進む。
const routeWhenReady = (s: WalkState): WalkState =>
  s.screen === Screen.Loading && s.stage >= LOADING_STAGES.length && s.plan !== null ? { ...s, screen: Screen.Route } : s;

const isPermutation = (order: readonly number[], size: number): boolean =>
  order.length === size && [...order].sort((a, b) => a - b).every((n, i) => n === i);

const nextCheckpoint = (s: WalkState): WalkState => {
  const step = s.step + 1;
  return step >= CHECKPOINTS ? { ...s, screen: Screen.Memory, step: CHECKPOINTS } : { ...s, screen: Screen.Route, step };
};

export const walkReducer = (s: WalkState, a: WalkAction): WalkState => {
  switch (a.type) {
    case "setDest":
      return { ...s, dest: a.dest };
    case "pickMood":
      return { ...s, mood: a.mood };
    case "pickBudget":
      return { ...s, budget: a.budget };
    case "setCare":
      return { ...s, care: { ...s.care, [a.key]: a.on } };
    case "start":
      if (!s.dest.trim()) return s;
      return { ...s, screen: Screen.Loading, stage: 0, step: 0, ...emptyRecords(), plan: null, order: null };
    case "advanceStage":
      return routeWhenReady({ ...s, stage: Math.min(s.stage + 1, LOADING_STAGES.length) });
    case "receivePlan":
      return routeWhenReady({ ...s, plan: a.plan, order: null });
    case "reorder":
      return s.plan && isPermutation(a.order, s.plan.quests.length) ? { ...s, order: a.order } : s;
    case "found":
      return nextCheckpoint(s);
    case "openCapture":
      return { ...s, screen: Screen.Capture };
    case "backToRoute":
      return { ...s, screen: Screen.Route };
    case "backToInput":
      // 入力のやり直し。記録・気分・時間は残す。消すのは明示的な restart だけ。
      return { ...s, screen: Screen.Input };
    case "shoot":
      return { ...s, shots: replaceAt(s.shots, s.step, true) };
    case "setMemo":
      return { ...s, memos: replaceAt(s.memos, s.step, a.memo) };
    case "saveAndNext":
      return nextCheckpoint(s);
    case "restart":
      return { ...initialWalk, dest: s.dest, mood: s.mood, care: s.care };
  }
};
