// /walk の一連の流れ（入力 → 探索 → ルート → 記録 → 思い出カード → フィード）を、
// AI 成功・AI 失敗・地図キーなしの 3 通りで最後まで通す統合テスト（SPEC F05）。
// 画面に、見本・固定値・推定値と本物（AI の結果・Google マップ）の区別が出ていることも確かめる。
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ETA_SAMPLE_NOTE } from "./components/EtaNote";
import { MEMORY_ESSAY_NOTE, MEMORY_MINUTES_NOTE, MEMORY_PHOTO_NOTE } from "./components/MemoryCard";
import { PHOTO_SAMPLE_NOTE } from "./components/PhotoSlot";
import { moodById } from "./content";
import { CHECKPOINTS, eta, LOADING_STAGES, MoodId } from "./flow";
import { FEED_SAMPLE_NOTE } from "./screens/FeedScreen";
import { LOADING_STAGES_NOTE } from "./screens/LoadingScreen";
import { AI_NOTICE, HAND_DRAWN_MAP_NOTE } from "./screens/RouteScreen";
import { WalkApp } from "./WalkApp";

// 地図キーの有無をテストごとに切り替える。RouteScreen は描画のたびに MAPS_API_KEY を読む。
const maps = vi.hoisted(() => ({ key: "" }));
vi.mock("@/lib/google-maps", () => ({
  get MAPS_API_KEY() {
    return maps.key;
  },
  loadGoogleMaps: () => Promise.reject(new Error("テストでは読み込まない")),
}));
// 本物の Google マップは jsdom で動かないので、同じ役割名の置き物にする。
vi.mock("@/components/RouteMap", () => ({
  default: () => <div role="application" aria-label="寄り道ルートの地図" />,
}));

const STAGE_MS = 700;
const DEST = "上野公園";
const MEMOS = ["風鈴の音が大きかった", "猫がいた", "ベンチで休んだ"] as const;
const apiQuest = (n: number) => ({ cp: `AIの地点${n}`, title: `AIのクエスト${n}`, why: `理由${n}`, s: [91, 82, 73] });
const AI_RESPONSE = (): Response => new Response(JSON.stringify({ quests: [1, 2, 3].map(apiQuest) }));
const FAILED_RESPONSE = (): Response => new Response(JSON.stringify({ reason: "upstream" }), { status: 502 });
const SAMPLE_QUESTS = moodById(MoodId.Quiet).quests;
const AI_TITLES = [1, 2, 3].map((n) => `AIのクエスト${n}`);
const SAMPLE_TITLES = SAMPLE_QUESTS.map((q) => q.title);

type Scenario = {
  name: string;
  mapKey: string;
  response: () => Response;
  titles: readonly string[];
  /** ルート画面の知らせ（role=status）に含まれるべき文。 */
  notice: RegExp;
  googleMap: boolean;
};

const SCENARIOS: readonly Scenario[] = [
  { name: "AI 成功（地図キーあり）", mapKey: "test-key", response: AI_RESPONSE, titles: AI_TITLES, notice: new RegExp(AI_NOTICE), googleMap: true },
  {
    name: "AI 失敗（地図キーあり）",
    mapKey: "test-key",
    response: FAILED_RESPONSE,
    titles: SAMPLE_TITLES,
    notice: /AIの呼び出しに失敗したため、サンプルのクエストを表示しています（AIが作ったものではありません）/,
    googleMap: true,
  },
  { name: "地図キーなし（AI 成功）", mapKey: "", response: AI_RESPONSE, titles: AI_TITLES, notice: new RegExp(AI_NOTICE), googleMap: false },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  maps.key = "";
});

const click = (name: string): void => {
  fireEvent.click(screen.getByRole("button", { name }));
};

/** 入力画面: 行き先・気分・寄り道時間を答える。経路を取る前の所要時間が目安だと出ていることも見る。 */
const answerInput = (): void => {
  expect(screen.getByRole("heading", { name: "最短じゃない道で、まだ知らない街へ" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: DEST } });
  click("次へ");
  click("次へ");
  const { total, extra } = eta(20);
  expect(screen.getByText(`約${total}分`)).toBeInTheDocument();
  expect(screen.getByText(`最短より${extra}分長い寄り道`)).toBeInTheDocument();
  expect(screen.getByText(ETA_SAMPLE_NOTE)).toBeInTheDocument();
  click("寄り道ルートを作る");
};

/** 探索の演出: 段階が演出だと出ていることを見て、全段階を進める。 */
const waitForRoute = async (): Promise<void> => {
  expect(screen.getByRole("heading", { name: "ルートを探しています" })).toBeInTheDocument();
  expect(screen.getByText(LOADING_STAGES_NOTE)).toBeInTheDocument();
  for (let i = 0; i < LOADING_STAGES.length; i++) {
    await act(async () => vi.advanceTimersByTime(STAGE_MS));
  }
};

/** ルート画面: 地図とクエストの出どころの表示を見る。 */
const expectRoute = (s: Scenario, step: number): void => {
  expect(screen.getByRole("heading", { name: "寄り道ルート" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: s.titles[step] })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(s.notice);
  if (s.googleMap) {
    expect(screen.getByRole("application", { name: "寄り道ルートの地図" })).toBeInTheDocument();
    expect(screen.queryByText(HAND_DRAWN_MAP_NOTE)).not.toBeInTheDocument();
    expect(screen.queryByText(/混雑を回避/)).not.toBeInTheDocument();
  } else {
    expect(screen.queryByRole("application", { name: "寄り道ルートの地図" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: new RegExp(`${DEST}に着く寄り道ルート`) })).toBeInTheDocument();
    expect(screen.getByText(HAND_DRAWN_MAP_NOTE)).toBeInTheDocument();
  }
};

/** 記録画面: 写真枠で撮影（見本の絵）し、ひとことメモを書いて次へ。 */
const recordCheckpoint = (step: number): void => {
  click("記録する");
  expect(screen.getByText(`チェックポイント ${step + 1} / ${CHECKPOINTS}`)).toBeInTheDocument();
  expect(screen.queryByText(/Gemini が最後に思い出カードを書きます/)).not.toBeInTheDocument();
  click("タップして撮影");
  expect(screen.getByRole("img", { name: "撮影した写真（見本）" })).toBeInTheDocument();
  expect(screen.getByText(PHOTO_SAMPLE_NOTE)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("ひとことメモ"), { target: { value: MEMOS[step] } });
  click("記録して次へ");
};

/** 思い出カード: 記録が載り、文章・写真・分数が見本・目安だと出ていることを見る。 */
const expectMemory = (s: Scenario): void => {
  expect(screen.getByRole("heading", { name: "今日の思い出カード" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: `${DEST}への寄り道` })).toBeInTheDocument();
  for (const memo of MEMOS) expect(screen.getByText(memo)).toBeInTheDocument();
  const checkpoints = s.titles === AI_TITLES ? [1, 2, 3].map((n) => `AIの地点${n}`) : SAMPLE_QUESTS.map((q) => q.checkpoint);
  for (const cp of checkpoints) expect(screen.getByRole("img", { name: `${cp}の写真（見本）` })).toBeInTheDocument();
  expect(screen.getByText(MEMORY_ESSAY_NOTE)).toBeInTheDocument();
  expect(screen.getByText(MEMORY_PHOTO_NOTE)).toBeInTheDocument();
  expect(screen.getByText(MEMORY_MINUTES_NOTE)).toBeInTheDocument();
  expect(screen.getByText(`+${eta(20).extra}分（目安）`)).toBeInTheDocument();
  expect(screen.queryByText(/Gemini が生成/)).not.toBeInTheDocument();
  expect(screen.queryByText("2026年11月5日")).not.toBeInTheDocument();
};

/** フィード: ともだちの投稿が見本だと出ていて、戻ると思い出カードに戻れる。 */
const expectFeed = (): void => {
  expect(screen.getByRole("heading", { name: "みんなの寄り道" })).toBeInTheDocument();
  expect(screen.getByRole("note")).toHaveTextContent(FEED_SAMPLE_NOTE);
  expect(within(screen.getByRole("list", { name: "友だちの寄り道ログ" })).getAllByRole("article").length).toBeGreaterThan(0);
  click("思い出カードに戻る");
  expect(screen.getByRole("heading", { name: "今日の思い出カード" })).toBeInTheDocument();
};

describe("/walk の通し", () => {
  it.each(SCENARIOS)("$name: 入力からフィードまで止まらず進み、見本と本物の区別が画面に出る", async (s) => {
    maps.key = s.mapKey;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockImplementation(async () => s.response());
    vi.stubGlobal("fetch", fetchMock);
    render(<WalkApp live />);

    answerInput();
    await waitForRoute();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/quests");

    for (let step = 0; step < CHECKPOINTS; step++) {
      expectRoute(s, step);
      recordCheckpoint(step);
    }

    expectMemory(s);
    click("ともだちの寄り道を見る");
    expectFeed();
  });

  it("AI の応答が来なくても（通信が拒否されても）見本で最後まで進む", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    render(<WalkApp live />);

    answerInput();
    await waitForRoute();
    for (let step = 0; step < CHECKPOINTS; step++) {
      expect(screen.getByRole("heading", { name: SAMPLE_TITLES[step] })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("サンプルのクエストを表示しています");
      click("見つけた");
    }
    expect(screen.getByRole("heading", { name: "今日の思い出カード" })).toBeInTheDocument();
  });
});
