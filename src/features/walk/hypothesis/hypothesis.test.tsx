import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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
