import { describe, expect, it, vi } from "vitest";

import { createVertexClient, VertexAuthError } from "./vertex";

const BODY = { contents: [{ role: "user", parts: [{ text: "こんにちは" }] }] };

describe("createVertexClient", () => {
  it("ADC のトークンを付けて、プロジェクト・場所・モデルの generateContent を呼ぶ", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    const client = createVertexClient({
      project: "df-2026-t184-prod",
      location: "global",
      model: "gemini-2.5-flash",
      getAccessToken: async () => "token-123",
      fetch: fetchMock,
    });

    await client.generateContent(BODY);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://aiplatform.googleapis.com/v1/projects/df-2026-t184-prod/locations/global/publishers/google/models/gemini-2.5-flash:generateContent",
    );
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-123", "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(BODY);
  });

  it("場所がリージョンのときは、そのリージョンのエンドポイントを使う", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    const client = createVertexClient({
      project: "p",
      location: "asia-northeast1",
      model: "m",
      getAccessToken: async () => "t",
      fetch: fetchMock,
    });

    await client.generateContent(BODY);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://asia-northeast1-aiplatform.googleapis.com/v1/projects/p/locations/asia-northeast1/publishers/google/models/m:generateContent",
    );
  });

  it("認証情報が取れないときは VertexAuthError にする", async () => {
    const client = createVertexClient({
      project: "p",
      location: "global",
      model: "m",
      getAccessToken: async () => {
        throw new Error("Could not load the default credentials");
      },
      fetch: vi.fn(),
    });

    await expect(client.generateContent(BODY)).rejects.toBeInstanceOf(VertexAuthError);
  });
});
