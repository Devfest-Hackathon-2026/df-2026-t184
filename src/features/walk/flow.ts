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

export type Budget = 10 | 20 | 30;
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
  stage: number;
  step: number;
  shots: boolean[];
  memos: string[];
};

export type WalkAction =
  | { type: "setDest"; dest: string }
  | { type: "pickMood"; mood: MoodId }
  | { type: "pickBudget"; budget: Budget }
  | { type: "start" }
  | { type: "advanceStage" }
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
  stage: 0,
  step: 0,
  ...emptyRecords(),
};

export type Eta = { shortest: number; extra: number; total: number };

export const eta = (budget: Budget): Eta => {
  const extra = EXTRA_BY_BUDGET[budget];
  return { shortest: SHORTEST_MIN, extra, total: SHORTEST_MIN + extra };
};

const replaceAt = <T,>(list: T[], index: number, value: T): T[] =>
  list.map((item, i) => (i === index ? value : item));

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
    case "start":
      if (!s.dest.trim()) return s;
      return { ...s, screen: Screen.Loading, stage: 0, step: 0, ...emptyRecords() };
    case "advanceStage": {
      const stage = s.stage + 1;
      return stage >= LOADING_STAGES.length ? { ...s, screen: Screen.Route, stage } : { ...s, stage };
    }
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
      return { ...initialWalk, dest: s.dest, mood: s.mood };
  }
};
