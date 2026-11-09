import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchQuestsFromApi, toWalkQuests } from "./api";
import { moodById } from "./content";
import { MoodId } from "./flow";

const apiQuest = (n: number) => ({ cp: `地点${n}`, title: `クエスト${n}`, why: `理由${n}`, s: [90, 80, 70 + n] });

afterEach(() => vi.unstubAllGlobals());

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

  it("サーバーがエラーを返したら null にする", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    expect(await fetchQuestsFromApi({ dest: "上野公園", mood: MoodId.Quiet, budget: 20 }, new AbortController().signal)).toBeNull();
  });

  it("通信に失敗したら null にする", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    expect(await fetchQuestsFromApi({ dest: "上野公園", mood: MoodId.Quiet, budget: 20 }, new AbortController().signal)).toBeNull();
  });
});
