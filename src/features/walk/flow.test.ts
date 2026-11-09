import { describe, expect, it } from "vitest";
import { eta, initialWalk, LOADING_STAGES, MoodId, Screen, walkReducer, type WalkAction, type WalkState } from "./flow";

const run = (actions: WalkAction[], from: WalkState = initialWalk): WalkState =>
  actions.reduce(walkReducer, from);

describe("eta", () => {
  it("寄り道してもいい時間に応じて、最短に足す分数が決まる", () => {
    expect(eta(10)).toEqual({ shortest: 18, extra: 8, total: 26 });
    expect(eta(20)).toEqual({ shortest: 18, extra: 14, total: 32 });
    expect(eta(30)).toEqual({ shortest: 18, extra: 23, total: 41 });
  });
});

describe("walkReducer", () => {
  it("行き先が空のままではルート作成に進まない", () => {
    const s = run([{ type: "setDest", dest: "  " }, { type: "start" }]);
    expect(s.screen).toBe(Screen.Input);
  });

  it("行き先を入れて始めると、探索中の画面になる", () => {
    const s = run([{ type: "setDest", dest: "上野公園" }, { type: "start" }]);
    expect(s.screen).toBe(Screen.Loading);
    expect(s.stage).toBe(0);
  });

  it("探索の段階をすべて終えるとルート画面になる", () => {
    const steps = Array.from({ length: LOADING_STAGES.length }, () => ({ type: "advanceStage" as const }));
    const s = run([{ type: "setDest", dest: "上野公園" }, { type: "start" }, ...steps]);
    expect(s.screen).toBe(Screen.Route);
  });

  it("見つけたを 3 回押すと思い出カードになる", () => {
    const start = { ...initialWalk, screen: Screen.Route, dest: "上野公園" };
    expect(run([{ type: "found" }], start).step).toBe(1);
    const s = run([{ type: "found" }, { type: "found" }, { type: "found" }], start);
    expect(s.screen).toBe(Screen.Memory);
    expect(s.step).toBe(3);
  });

  it("記録画面で撮影とメモをして次へ進むと、その地点に保存されてルートに戻る", () => {
    const start = { ...initialWalk, screen: Screen.Route, dest: "上野公園" };
    const s = run(
      [{ type: "openCapture" }, { type: "shoot" }, { type: "setMemo", memo: "風鈴が鳴っていた" }, { type: "saveAndNext" }],
      start,
    );
    expect(s.screen).toBe(Screen.Route);
    expect(s.step).toBe(1);
    expect(s.shots).toEqual([true, false, false]);
    expect(s.memos[0]).toBe("風鈴が鳴っていた");
  });

  it("最後の地点で記録して次へ進むと思い出カードになる", () => {
    const start = { ...initialWalk, screen: Screen.Capture, dest: "上野公園", step: 2 };
    expect(run([{ type: "saveAndNext" }], start).screen).toBe(Screen.Memory);
  });

  it("地図から入力に戻ると、時間・気分・記録はそのまま残る", () => {
    const walking: WalkState = {
      ...initialWalk, screen: Screen.Route, dest: "上野公園", mood: MoodId.Retro, budget: 30, step: 1,
      shots: [true, false, false], memos: ["風鈴が鳴っていた", "", ""],
    };
    const s = run([{ type: "backToInput" }], walking);
    expect(s.screen).toBe(Screen.Input);
    expect(s).toMatchObject({ budget: 30, mood: MoodId.Retro, shots: [true, false, false], memos: ["風鈴が鳴っていた", "", ""] });
  });

  it("入力に戻ってから作り直すと、記録は新しいルート用にリセットされる", () => {
    const walking: WalkState = {
      ...initialWalk, screen: Screen.Route, dest: "上野公園", budget: 30, step: 1,
      shots: [true, false, false], memos: ["a", "", ""],
    };
    const s = run([{ type: "backToInput" }, { type: "start" }], walking);
    expect(s.screen).toBe(Screen.Loading);
    expect(s.budget).toBe(30);
    expect(s.shots).toEqual([false, false, false]);
    expect(s.memos).toEqual(["", "", ""]);
  });

  it("もう一度歩くと、気分と行き先は残して記録は消える", () => {
    const done: WalkState = {
      ...initialWalk, screen: Screen.Memory, dest: "上野公園", mood: MoodId.Retro, step: 3,
      shots: [true, true, true], memos: ["a", "b", "c"],
    };
    const s = run([{ type: "restart" }], done);
    expect(s).toEqual({ ...initialWalk, dest: "上野公園", mood: MoodId.Retro });
  });
});
