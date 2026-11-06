import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHECKPOINTS, initialWalk, Screen, type WalkState } from "../flow";
import { MemoryScreen } from "./MemoryScreen";

const STATE: WalkState = {
  ...initialWalk,
  screen: Screen.Memory,
  dest: "上野公園",
  step: CHECKPOINTS,
  shots: [true, false, true],
  memos: ["風鈴の音が思ったより大きかった", "", "ベンチで10分、ぼーっとした"],
};
const COPIED = "共有リンクをコピーしました";
const LONG_ENOUGH_MS = 10_000;

describe("MemoryScreen", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("シェアするとお知らせが出て、しばらくすると消える", () => {
    render(<MemoryScreen state={STATE} dispatch={vi.fn()} />);
    expect(screen.queryByText(COPIED)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "シェアする" }));
    expect(screen.getByText(COPIED)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(LONG_ENOUGH_MS));
    expect(screen.queryByText(COPIED)).not.toBeInTheDocument();
  });

  it("もう一度歩くで restart を送る", () => {
    const dispatch = vi.fn();
    render(<MemoryScreen state={STATE} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole("button", { name: "もう一度歩く" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "restart" });
  });

  it("onOpenFeed があるときだけ、ともだちの寄り道へのボタンを出す", () => {
    const onOpenFeed = vi.fn();
    const { rerender } = render(<MemoryScreen state={STATE} dispatch={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "ともだちの寄り道を見る" })).not.toBeInTheDocument();

    rerender(<MemoryScreen state={STATE} dispatch={vi.fn()} onOpenFeed={onOpenFeed} />);
    fireEvent.click(screen.getByRole("button", { name: "ともだちの寄り道を見る" }));
    expect(onOpenFeed).toHaveBeenCalledOnce();
  });
});
