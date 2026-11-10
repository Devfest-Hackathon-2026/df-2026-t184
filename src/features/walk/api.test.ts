import { afterEach, describe, expect, it, vi } from "vitest";

import { QuestFailure } from "@/lib/quests";

import { fetchQuestsFromApi, requestQuests, startForAi, toWalkQuests } from "./api";
import { moodById } from "./content";
import { MoodId } from "./flow";

const apiQuest = (n: number) => ({ cp: `地点${n}`, title: `クエスト${n}`, why: `理由${n}`, s: [90, 80, 70 + n] });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("toWalkQuests", () => {
  it("API の 3 地点を画面のクエストにし、色は同じ気分の見本から借りる", () => {
    const quests = toWalkQuests({ quests: [apiQuest(1), apiQuest(2), apiQuest(3)] }, MoodId.Retro);
    expect(quests).toEqual(
      moodById(MoodId.Retro).quests.map((sample, i) => ({
        checkpoint: `地点${i + 1}`,
        title: `クエスト${i + 1}`,
        why: `理由${i + 1}`,
        tone: sample.tone,
        scores: [90, 80, 71 + i],
      })),
    );
  });

  it("地点が足りない・形が違う応答は使わない", () => {
    expect(toWalkQuests({ quests: [apiQuest(1), apiQuest(2)] }, MoodId.Quiet)).toBeNull();
    expect(toWalkQuests({ quests: [apiQuest(1), apiQuest(2), { cp: "x" }] }, MoodId.Quiet)).toBeNull();
    expect(toWalkQuests({ error: "unexpected output" }, MoodId.Quiet)).toBeNull();
  });
});

describe("fetchQuestsFromApi", () => {
  it("気分と時間は API が受け取る添字にして送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ quests: [apiQuest(1), apiQuest(2), apiQuest(3)] })));
    vi.stubGlobal("fetch", fetchMock);

    const quests = await fetchQuestsFromApi({ dest: " 上野公園 ", mood: MoodId.Local, budget: 30 }, new AbortController().signal);

    expect(quests).toHaveLength(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/quests");
    expect(JSON.parse(init.body)).toEqual({ dest: "上野公園", mood: 2, budget: 2 });
  });

  it("出発地の名前を送る。現在地は座標を約1km単位に丸めた文にして送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ quests: [apiQuest(1), apiQuest(2), apiQuest(3)] })));
    vi.stubGlobal("fetch", fetchMock);
    await fetchQuestsFromApi({ dest: "上野公園", mood: MoodId.Quiet, budget: 20, start: " 神田駅 " }, new AbortController().signal);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ dest: "上野公園", mood: 0, budget: 1, start: "神田駅" });
    expect(startForAi("現在地", { lat: 35.66789, lng: 139.65123 })).toBe("現在地（北緯35.67・東経139.65付近）");
    expect(startForAi("神田駅", { lat: 35.69, lng: 139.77 })).toBe("神田駅");
  });

  it("サーバーがエラーを返したら null にする", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    expect(await fetchQuestsFromApi({ dest: "上野公園", mood: MoodId.Quiet, budget: 20 }, new AbortController().signal)).toBeNull();
  });

  it("通信に失敗したら null にする", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    expect(await fetchQuestsFromApi({ dest: "上野公園", mood: MoodId.Quiet, budget: 20 }, new AbortController().signal)).toBeNull();
  });
});

describe("requestQuests", () => {
  const REQ = { dest: "上野公園", mood: MoodId.Quiet, budget: 20 } as const;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const run = () => requestQuests(REQ, new AbortController().signal);

  it("成功したらクエストを返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ quests: [apiQuest(1), apiQuest(2), apiQuest(3)] })));
    const outcome = await run();
    expect("quests" in outcome && outcome.quests).toHaveLength(3);
  });

  it.each([QuestFailure.Timeout, QuestFailure.InvalidOutput, QuestFailure.Upstream, QuestFailure.Config])(
    "サーバーが返した原因 %s をそのまま返し、コンソールに残す",
    async (reason) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "x", reason }, 502)));
      expect(await run()).toEqual({ failure: reason });
      expect(warn).toHaveBeenCalledWith("[quests] falling back to samples", reason, 502);
    },
  );

  it("原因が読めない 504 は時間切れ、それ以外は上流のエラーにする", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Gateway Timeout", { status: 504 })));
    expect(await run()).toEqual({ failure: QuestFailure.Timeout });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ reason: "unknown" }, 500)));
    expect(await run()).toEqual({ failure: QuestFailure.Upstream });
  });

  it("429 は回数制限（rate_limited）にする。原因が読めなくてもステータスで決める", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ reason: "rate_limited" }, 429)));
    expect(await run()).toEqual({ failure: QuestFailure.RateLimited });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Too Many Requests", { status: 429 })));
    expect(await run()).toEqual({ failure: QuestFailure.RateLimited });
  });

  it("200 でも形が違う応答は不正な応答にする", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ quests: [apiQuest(1)] })));
    expect(await run()).toEqual({ failure: QuestFailure.InvalidOutput });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>")));
    expect(await run()).toEqual({ failure: QuestFailure.InvalidOutput });
  });

  it("ブラウザ側の時間切れは timeout、通信の失敗は network にする", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    expect(await run()).toEqual({ failure: QuestFailure.Timeout });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    expect(await run()).toEqual({ failure: QuestFailure.Network });
  });
});
