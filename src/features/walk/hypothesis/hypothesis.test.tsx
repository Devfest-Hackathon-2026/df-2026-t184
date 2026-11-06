import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initialWalk, Screen } from "../flow";
import { WalkApp } from "../WalkApp";
import { HypothesisFrame } from "./HypothesisFrame";
import { MOCK_DATA_NOTICE, SCENARIOS } from "./scenarios";

afterEach(() => cleanup());

describe("SCENARIOS", () => {
  it("日常と観光の 2 シナリオが、別々のIDで定義されている", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["daily", "tourism"]);
  });

  it("各シナリオに対象・困りごと・期待変化・評価質問・行き先がある", () => {
    for (const s of SCENARIOS) {
      expect(s.target).not.toBe("");
      expect(s.problem).not.toBe("");
      expect(s.expected).not.toBe("");
      expect(s.questions.length).toBeGreaterThan(0);
      expect(s.dest).not.toBe("");
    }
  });
});

describe("HypothesisFrame", () => {
  it("シナリオの対象・困りごと・期待変化・評価質問を外枠に出す", () => {
    const scenario = SCENARIOS[0];
    render(
      <HypothesisFrame scenario={scenario}>
        <p>中身</p>
      </HypothesisFrame>,
    );
    expect(screen.getByText(scenario.target)).toBeInTheDocument();
    expect(screen.getByText(scenario.problem)).toBeInTheDocument();
    expect(screen.getByText(scenario.expected)).toBeInTheDocument();
    for (const q of scenario.questions) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
    expect(screen.getByText("中身")).toBeInTheDocument();
  });

  it("見本データである注意を外枠に出す", () => {
    render(<HypothesisFrame scenario={SCENARIOS[1]}>{null}</HypothesisFrame>);
    expect(screen.getByText(MOCK_DATA_NOTICE)).toBeInTheDocument();
  });
});

describe("WalkApp のシナリオ初期値", () => {
  it("initial を渡すと入力画面の行き先に反映される", () => {
    const scenario = SCENARIOS[1];
    render(<WalkApp initial={{ ...initialWalk, screen: Screen.Input, dest: scenario.dest }} />);
    expect(screen.getByLabelText("行き先")).toHaveValue(scenario.dest);
  });
});


describe("仮説モックの一連の体験", () => {
  it.each(SCENARIOS)("$id: 入力から記録・思い出・投稿を経て入力に戻れる", (scenario) => {
    vi.useFakeTimers();
    try {
      render(<WalkApp initial={{ ...initialWalk, dest: scenario.dest }} />);
      fireEvent.click(screen.getByRole("button", { name: "寄り道ルートを作る" }));
      for (let stage = 0; stage < 4; stage++) {
        act(() => vi.advanceTimersByTime(700));
      }
      fireEvent.click(screen.getByRole("button", { name: "記録する" }));
      fireEvent.change(screen.getByLabelText("ひとことメモ"), { target: { value: "静かな路地を見つけた" } });
      fireEvent.click(screen.getByRole("button", { name: "記録して次へ" }));
      fireEvent.click(screen.getByRole("button", { name: "見つけた" }));
      fireEvent.click(screen.getByRole("button", { name: "見つけた" }));
      fireEvent.click(screen.getByRole("button", { name: "ともだちの寄り道を見る" }));
      expect(screen.getByRole("heading", { name: "ともだちの寄り道" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "思い出カードに戻る" }));
      fireEvent.click(screen.getByRole("button", { name: "もう一度歩く" }));
      expect(screen.getByLabelText("行き先")).toHaveValue(scenario.dest);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
});
