import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialWalk, LOADING_STAGES } from "./flow";
import { WalkApp } from "./WalkApp";
import { answerQuestionsAndStart } from "./testing";

const STAGE_MS = 700;
const apiQuest = (n: number) => ({ cp: `AIの地点${n}`, title: `AIのクエスト${n}`, why: `理由${n}`, s: [91, 82, 73] });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const startWalk = async (): Promise<void> => {
  render(<WalkApp live initial={{ ...initialWalk, dest: "上野公園" }} />);
  answerQuestionsAndStart();
  for (let i = 0; i < LOADING_STAGES.length; i++) {
    await act(async () => vi.advanceTimersByTime(STAGE_MS));
  }
};

describe("WalkApp の live 指定", () => {
  it("AI が作ったクエストと点数を地図の画面に出す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ quests: [1, 2, 3].map(apiQuest) }))));
    await startWalk();

    expect(screen.getByRole("heading", { name: "AIのクエスト1" })).toBeInTheDocument();
    expect(screen.getByText("AIの地点1")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
    expect(screen.queryByText(/サンプルのクエスト/)).not.toBeInTheDocument();
  });

  it("AI が失敗したら見本のクエストにして、そのことを知らせる", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 502 })));
    await startWalk();

    expect(screen.getByRole("heading", { name: "鳥居の奥で、風鈴の音を探そう" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("サンプルのクエスト");
  });

  it("AI の結果が届くまでは探索中の画面で待つ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    await startWalk();

    expect(screen.getByRole("heading", { name: "ルートを探しています" })).toBeInTheDocument();
  });
});
