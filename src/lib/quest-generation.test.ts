import { describe, expect, it, vi } from "vitest";

import { generateQuests, type QuestLogger } from "./quest-generation";
import { QuestFailure } from "./quests";
import { VertexAuthError, type VertexClient } from "./vertex";

const INPUT = { dest: "上野公園", moodLabel: "静けさ優先", moodDesc: "人の少ない路地や小道を選ぶ", extraMin: 14 };
const MODEL = "gemini-test";

const geminiQuest = (n: number) => ({ cp: `地点${n}`, title: `クエスト${n}`, why: `理由${n}`, scores: { quiet: 90, retro: 80, local: 70 } });
const geminiBody = (text: string) => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] });
const okBody = geminiBody(JSON.stringify({ quests: [1, 2, 3].map(geminiQuest) }));

const clientOf = (generateContent: VertexClient["generateContent"]): VertexClient => ({ model: MODEL, generateContent });

const spyLogger = () => {
  const log = { info: vi.fn(), error: vi.fn() } satisfies QuestLogger;
  return log;
};

// 呼ばれるたびに 0, 1500 ... と進む時計。所要時間がログに出ることを確かめる。
const clock = () => {
  let t = 0;
  return () => {
    const now = t;
    t += 1500;
    return now;
  };
};

describe("generateQuests", () => {
  it("成功したら 3 地点を返し、モデル名と所要時間をログに出す", async () => {
    const log = spyLogger();
    const result = await generateQuests(clientOf(async () => new Response(okBody)), INPUT, { log, now: clock() });

    expect(result).toEqual({
      ok: true,
      quests: [1, 2, 3].map((n) => ({ cp: `地点${n}`, title: `クエスト${n}`, why: `理由${n}`, s: [90, 80, 70] })),
    });
    expect(log.info).toHaveBeenCalledWith("[quests] ok", { model: MODEL, elapsedMs: 1500 });
    expect(log.error).not.toHaveBeenCalled();
  });

  it("時間切れは timeout（504）にして、待った上限をログに残す", async () => {
    const log = spyLogger();
    // 本物の AbortSignal.timeout で中断されるまで返さない Gemini。
    const hanging = clientOf(
      (_body, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );

    const result = await generateQuests(hanging, INPUT, { log, timeoutMs: 10 });

    expect(result).toEqual({ ok: false, failure: QuestFailure.Timeout, status: 504 });
    expect(log.error).toHaveBeenCalledWith("[quests] failed", expect.objectContaining({ reason: "timeout", timeoutMs: 10, model: MODEL }));
  });

  it("JSON として読めない出力は invalid_output（502）にして、出力の先頭をログに残す", async () => {
    const log = spyLogger();
    const result = await generateQuests(clientOf(async () => new Response(geminiBody("これはJSONではない"))), INPUT, { log });

    expect(result).toEqual({ ok: false, failure: QuestFailure.InvalidOutput, status: 502 });
    expect(log.error).toHaveBeenCalledWith(
      "[quests] failed",
      expect.objectContaining({ reason: "invalid_output", detail: expect.stringContaining("これはJSONではない") }),
    );
  });

  it("地点が足りない出力も invalid_output にする", async () => {
    const short = geminiBody(JSON.stringify({ quests: [geminiQuest(1)] }));
    const result = await generateQuests(clientOf(async () => new Response(short)), INPUT, { log: spyLogger() });
    expect(result).toMatchObject({ ok: false, failure: QuestFailure.InvalidOutput });
  });

  it("候補がない応答（安全フィルタなど）も invalid_output にする", async () => {
    const result = await generateQuests(clientOf(async () => new Response(JSON.stringify({ candidates: [] }))), INPUT, { log: spyLogger() });
    expect(result).toMatchObject({ ok: false, failure: QuestFailure.InvalidOutput });
  });

  it("Gemini のエラー応答は upstream（502）にして、ステータスと理由をログに残す", async () => {
    const log = spyLogger();
    const reason = JSON.stringify({ error: { code: 429, message: "Resource exhausted" } });
    const result = await generateQuests(clientOf(async () => new Response(reason, { status: 429 })), INPUT, { log });

    expect(result).toEqual({ ok: false, failure: QuestFailure.Upstream, status: 502 });
    expect(log.error).toHaveBeenCalledWith(
      "[quests] failed",
      expect.objectContaining({ reason: "upstream", status: 429, detail: expect.stringContaining("Resource exhausted") }),
    );
  });

  it("ログに出す Gemini の理由は 300 字までにする", async () => {
    const log = spyLogger();
    await generateQuests(clientOf(async () => new Response("x".repeat(1000), { status: 503 })), INPUT, { log });
    const [, data] = log.error.mock.calls[0];
    expect(data.detail).toHaveLength(300);
  });

  it("通信の失敗は upstream にする", async () => {
    const log = spyLogger();
    const result = await generateQuests(clientOf(async () => Promise.reject(new TypeError("fetch failed"))), INPUT, { log });
    expect(result).toMatchObject({ ok: false, failure: QuestFailure.Upstream, status: 502 });
    expect(log.error).toHaveBeenCalledWith("[quests] failed", expect.objectContaining({ detail: "TypeError: fetch failed" }));
  });

  it("認証情報を取れなければ config（500）にする", async () => {
    const log = spyLogger();
    const result = await generateQuests(clientOf(async () => Promise.reject(new VertexAuthError(new Error("no ADC")))), INPUT, { log });
    expect(result).toEqual({ ok: false, failure: QuestFailure.Config, status: 500 });
    expect(log.error).toHaveBeenCalledWith("[quests] failed", expect.objectContaining({ reason: "config", detail: "Error: no ADC" }));
  });

  it("プロジェクトが設定されていなければ Gemini を呼ばずに config にする", async () => {
    const log = spyLogger();
    expect(await generateQuests(null, INPUT, { log })).toEqual({ ok: false, failure: QuestFailure.Config, status: 500 });
    expect(log.error).toHaveBeenCalledWith("[quests] failed", expect.objectContaining({ reason: "config" }));
  });
});
