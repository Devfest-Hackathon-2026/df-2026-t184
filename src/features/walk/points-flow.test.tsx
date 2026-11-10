// F06: /walk で地点を記録するとポイントと称号が付き、ハンコ帳に出る。保存しないことも画面に出る。
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHECKPOINTS, LOADING_STAGES } from "./flow";
import { POINTS_NOT_SAVED_NOTE, POINTS_SAMPLE_NOTE } from "./points";
import { WalkApp } from "./WalkApp";

const STAGE_MS = 700;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const click = (name: string): void => {
  fireEvent.click(screen.getByRole("button", { name }));
};

const startWalk = async (): Promise<void> => {
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "上野公園" } });
  click("次へ");
  click("次へ");
  click("寄り道ルートを作る");
  for (let i = 0; i < LOADING_STAGES.length; i++) {
    await act(async () => vi.advanceTimersByTime(STAGE_MS));
  }
};

const openStamps = (): HTMLElement => {
  click("ハンコ帳");
  return screen.getByRole("region", { name: "ポイントと称号" });
};

describe("ポイントと称号", () => {
  it("歩く前は 0 pt で、保存しないことと見本を数えないことが出る", () => {
    render(<WalkApp />);
    const panel = openStamps();
    expect(within(panel).getByText("0 pt")).toBeInTheDocument();
    expect(within(panel).getByText("称号：寄り道みならい")).toBeInTheDocument();
    expect(within(panel).getByRole("note")).toHaveTextContent(POINTS_NOT_SAVED_NOTE);
    expect(within(panel).getByRole("note")).toHaveTextContent(POINTS_SAMPLE_NOTE);
  });

  it("写真とメモを記録して歩き終えると、思い出カードとハンコ帳にポイントと称号が出る", async () => {
    render(<WalkApp />);
    await startWalk();
    for (let step = 0; step < CHECKPOINTS; step++) {
      click("記録する");
      click("タップして撮影");
      fireEvent.change(screen.getByLabelText("ひとことメモ"), { target: { value: `メモ${step}` } });
      click("記録して次へ");
    }
    expect(screen.getByText(/この寄り道で \+70 pt/)).toBeInTheDocument();
    expect(screen.getAllByText(POINTS_NOT_SAVED_NOTE).length).toBeGreaterThan(0);

    const panel = openStamps();
    expect(within(panel).getByText("70 pt")).toBeInTheDocument();
    expect(within(panel).getByText("称号：寄り道名人")).toBeInTheDocument();
    expect(within(panel).getByText("あと 70 pt で「寄り道マスター」")).toBeInTheDocument();
    const lines = within(panel).getByRole("list", { name: "寄り道ごとのポイント" });
    expect(within(lines).getByText(/上野公園：\+70 pt/)).toHaveTextContent("写真 3 枚 +15");
  });

  it("「見つけた」だけで回っても達成ぶんのポイントが付き、リロード（再マウント）で 0 に戻る", async () => {
    const { unmount } = render(<WalkApp />);
    await startWalk();
    for (let step = 0; step < CHECKPOINTS; step++) click("見つけた");
    expect(screen.getByText(/この寄り道で \+40 pt/)).toBeInTheDocument();
    expect(within(openStamps()).getByText("40 pt")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "ポイントと称号" })).getByText("称号：寄り道さんぽ人")).toBeInTheDocument();

    unmount();
    render(<WalkApp />);
    expect(within(openStamps()).getByText("0 pt")).toBeInTheDocument();
  });
});
