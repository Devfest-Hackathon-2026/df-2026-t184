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
  vi.restoreAllMocks();
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

  it.each([
    [{ reason: "timeout" }, 504, "AIの応答が時間内に届かなかったため"],
    [{ reason: "invalid_output" }, 502, "AIの応答の形が正しくなかったため"],
    [{ reason: "upstream" }, 502, "AIの呼び出しに失敗したため"],
    [{ reason: "rate_limited" }, 429, "短い時間にAIを呼びすぎた（1分ほど待つとまた使えます）ため"],
  ])("AI の失敗の原因 %o を、見本に切り替えた知らせに出す", async (body, status, reasonText) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
    await startWalk();

    expect(screen.getByRole("heading", { name: "鳥居の奥で、風鈴の音を探そう" })).toBeInTheDocument();
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(reasonText);
    expect(notice).toHaveTextContent("サンプルのクエストを表示しています");
    expect(notice).toHaveTextContent("AIが作ったものではありません");
  });

  it("ブラウザ側で時間切れになっても止まらず、見本に切り替えて知らせる", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    await startWalk();

    expect(screen.getByRole("status")).toHaveTextContent("AIの応答が時間内に届かなかったため、サンプルのクエスト");
  });
});

