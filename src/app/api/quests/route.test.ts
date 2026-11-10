import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { questsLimiter, RATE_LIMIT_PER_MINUTE } from "@/lib/rate-limit";
import type { VertexClient } from "@/lib/vertex";

const vertex = vi.hoisted(() => ({ client: null as VertexClient | null }));
vi.mock("@/lib/vertex-server", () => ({ vertexFromEnv: () => vertex.client }));

const { POST } = await import("./route");

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/quests", { method: "POST", body: JSON.stringify(body) }));
const VALID = { dest: "上野公園", mood: 0, budget: 1 };

const geminiQuest = (n: number) => ({ cp: `地点${n}`, title: `クエスト${n}`, why: `理由${n}`, scores: { quiet: 1, retro: 2, local: 3 } });
const geminiBody = (text: string) => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] });

beforeEach(() => {
  questsLimiter.reset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vertex.client = null;
});

describe("POST /api/quests", () => {
  it("成功したらクエストを返す", async () => {
    vertex.client = { model: "m", generateContent: async () => new Response(geminiBody(JSON.stringify({ quests: [1, 2, 3].map(geminiQuest) }))) };
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect((await res.json()).quests).toHaveLength(3);
  });

  it("不正な応答は 502 と reason: invalid_output を返し、原因をログに出す", async () => {
    vertex.client = { model: "m", generateContent: async () => new Response(geminiBody("{")) };
    const res = await post(VALID);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ reason: "invalid_output" });
    expect(console.error).toHaveBeenCalledWith("[quests] failed", expect.stringContaining('"reason":"invalid_output"'));
  });

  it("上流のエラーは 502 と reason: upstream を返す", async () => {
    vertex.client = { model: "m", generateContent: async () => new Response("overloaded", { status: 503 }) };
    const res = await post(VALID);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ reason: "upstream" });
    expect(console.error).toHaveBeenCalledWith("[quests] failed", expect.stringContaining('"status":503'));
  });

  it("時間切れは 504 と reason: timeout を返す", async () => {
    vertex.client = {
      model: "m",
      generateContent: async () => Promise.reject(new DOMException("The operation was aborted due to timeout", "TimeoutError")),
    };
    const res = await post(VALID);
    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ reason: "timeout" });
  });

  it("プロジェクト未設定は 500 と reason: config を返す", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ reason: "config" });
  });

  it("入力が不正なら Gemini を呼ばずに 400 を返す", async () => {
    const generateContent = vi.fn();
    vertex.client = { model: "m", generateContent };
    expect((await post({ ...VALID, mood: 9 })).status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("同じ接続元から1分に上限を超えると、Gemini を呼ばずに 429 と reason: rate_limited を返す（stg・prod）", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "prod");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const generateContent = vi.fn(async () => new Response(geminiBody(JSON.stringify({ quests: [1, 2, 3].map(geminiQuest) }))));
    vertex.client = { model: "m", generateContent };
    // App Hosting は接続元 IP を x-fah-client-ip に入れて渡す。左側の X-Forwarded-For は利用者が書けるので使わない
    const postFrom = (ip: string, xff?: string) =>
      POST(
        new Request("http://localhost/api/quests", {
          method: "POST",
          headers: { "x-fah-client-ip": ip, ...(xff ? { "x-forwarded-for": xff } : {}) },
          body: JSON.stringify(VALID),
        }),
      );
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) expect((await postFrom("203.0.113.9")).status).toBe(200);
    const res = await postFrom("203.0.113.9");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(await res.json()).toMatchObject({ reason: "rate_limited" });
    // 利用者が X-Forwarded-For を偽っても、同じ接続元なら断る
    expect((await postFrom("203.0.113.9", "1.2.3.4")).status).toBe(429);
    expect(generateContent).toHaveBeenCalledTimes(RATE_LIMIT_PER_MINUTE);
    expect((await postFrom("198.51.100.1")).status).toBe(200);
  });

  it("ローカルではヘッダーを変えても制限を避けられない（入力が不正な連打も数える）", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "local");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const postAs = (headers: Record<string, string>) =>
      POST(new Request("http://localhost/api/quests", { method: "POST", headers, body: "{}" }));
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) expect((await postAs({ "x-forwarded-for": "203.0.113.1" })).status).toBe(400);
    expect((await postAs({ "x-forwarded-for": "203.0.113.2" })).status).toBe(429);
    expect((await postAs({ "x-fah-client-ip": "203.0.113.3" })).status).toBe(429);
  });
});

describe("POST /api/quests の歩きやすさの希望", () => {
  it("care.slope が true なら、Gemini へのプロンプトに坂の希望が入る", async () => {
    const prompts: string[] = [];
    vertex.client = {
      generateContent: async (req: { contents: { parts: { text: string }[] }[] }) => {
        prompts.push(req.contents[0].parts[0].text);
        return new Response(geminiBody(JSON.stringify({ quests: [geminiQuest(1), geminiQuest(2), geminiQuest(3)] })));
      },
    } as unknown as VertexClient;
    await post({ ...VALID, care: { slope: true, shade: "yes" } });
    expect(prompts[0]).toContain("坂");
    expect(prompts[0]).not.toContain("日陰");
  });
});


describe("POST /api/quests の出発地", () => {
  const capture = () => {
    const prompts: string[] = [];
    vertex.client = {
      generateContent: async (req: { contents: { parts: { text: string }[] }[] }) => {
        prompts.push(req.contents[0].parts[0].text);
        return new Response(geminiBody(JSON.stringify({ quests: [geminiQuest(1), geminiQuest(2), geminiQuest(3)] })));
      },
    } as unknown as VertexClient;
    return prompts;
  };

  it("出発地を、山かっこを取り除いて Gemini へのプロンプトに入れる", async () => {
    const prompts = capture();
    await post({ ...VALID, start: "神田<駅>" });
    expect(prompts[0]).toContain("<start>神田駅</start>");
  });

  it("出発地が長すぎる・文字列でないなら 400 を返す", async () => {
    capture();
    expect((await post({ ...VALID, start: "あ".repeat(61) })).status).toBe(400);
    expect((await post({ ...VALID, start: 1 })).status).toBe(400);
  });
});
