import { describe, expect, it, vi } from "vitest";

import { afterEach } from "vitest";

import { clientKey, createRateLimiter, isBehindTrustedProxy, LOCAL_KEY, rateLimitResponse, UNKNOWN_KEY } from "./rate-limit";

const req = (headers: Record<string, string> = {}) => new Request("http://localhost/api/x", { method: "POST", headers });

describe("createRateLimiter", () => {
  it("窓の中で上限回までは通し、超えたら待つ秒数つきで断る", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t });
    expect([1, 2, 3].map(() => limiter.check("a").ok)).toEqual([true, true, true]);
    t = 15_000;
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterSec: 45 });
  });

  it("IP ごとに別に数える", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
    expect(limiter.check("b").ok).toBe(true);
  });

  it("窓が過ぎたら数え直す", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => t });
    limiter.check("a");
    expect(limiter.check("a").ok).toBe(false);
    t = 60_000;
    expect(limiter.check("a").ok).toBe(true);
  });

  it("覚えるキーの数に上限があり、超えたら古いものから捨てる", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2, now: () => 0 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c"); // a が捨てられる
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("c").ok).toBe(false);
  });

  it("reset で数えた回数を消す", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    limiter.check("a");
    limiter.reset();
    expect(limiter.check("a").ok).toBe(true);
  });
});

describe("clientKey", () => {
  const proxied = { behindTrustedProxy: true };

  it("App Hosting が付けた x-fah-client-ip を接続元にする（IPv4・IPv6）", () => {
    expect(clientKey(req({ "x-fah-client-ip": "203.0.113.5" }), proxied)).toBe("203.0.113.5");
    expect(clientKey(req({ "x-fah-client-ip": "2001:db8::1" }), proxied)).toBe("2001:db8::1");
  });

  it("X-Forwarded-For は接続元の決めに使わない（左側は利用者が自由に書ける）", () => {
    // hosted.app 経由では前段が x-fah-client-ip を実際の接続元 IP で上書きする（stg で実測）
    expect(clientKey(req({ "x-fah-client-ip": "203.0.113.5", "x-forwarded-for": "1.1.1.1, 2.2.2.2" }), proxied)).toBe("203.0.113.5");
    // x-fah-client-ip がなければ X-Forwarded-For の値だけでは接続元を決めない
    expect(clientKey(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.5" }), proxied)).toBe(UNKNOWN_KEY);
  });

  it("接続元を決められない（ヘッダーがない・IP の形でない）ときは共通のキーで数える", () => {
    expect(clientKey(req(), proxied)).toBe(UNKNOWN_KEY);
    expect(clientKey(req({ "x-fah-client-ip": "<script>" }), proxied)).toBe(UNKNOWN_KEY);
  });

  it("前段のプロキシがない環境では、ヘッダーを無視して全員を1つのキーで数える", () => {
    const local = { behindTrustedProxy: false };
    expect(clientKey(req({ "x-fah-client-ip": "1.1.1.1" }), local)).toBe(LOCAL_KEY);
    expect(clientKey(req({ "x-forwarded-for": "2.2.2.2" }), local)).toBe(LOCAL_KEY);
    expect(clientKey(req({ "x-real-ip": "3.3.3.3" }), local)).toBe(LOCAL_KEY);
  });
});

describe("isBehindTrustedProxy", () => {
  it("stg・prod だけ前段にロードバランサがあるとみなし、local・未設定・不明な値はみなさない", () => {
    expect([" stg", "PROD"].map(isBehindTrustedProxy)).toEqual([true, true]);
    expect(["local", undefined, "", "staging"].map(isBehindTrustedProxy)).toEqual([false, false, false, false]);
  });
});

describe("rateLimitResponse", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ローカルでは X-Forwarded-For を変えても制限を避けられない", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "local");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createRateLimiter({ limit: 1, windowMs: 30_000, now: () => 0 });
    expect(rateLimitResponse(limiter, req({ "x-forwarded-for": "1.1.1.1" }), "t")).toBeNull();
    expect(rateLimitResponse(limiter, req({ "x-forwarded-for": "2.2.2.2" }), "t")?.status).toBe(429);
    vi.restoreAllMocks();
  });

  it("stg・prod では接続元 IP ごとに数え、X-Forwarded-For を変えても制限を避けられない", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "prod");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createRateLimiter({ limit: 1, windowMs: 30_000, now: () => 0 });
    const from = (ip: string, xff?: string) =>
      rateLimitResponse(limiter, req({ "x-fah-client-ip": ip, ...(xff ? { "x-forwarded-for": xff } : {}) }), "t");
    expect(from("203.0.113.5")).toBeNull();
    expect(from("203.0.113.5", "9.9.9.9")?.status).toBe(429);
    expect(from("203.0.113.6")).toBeNull();
    vi.restoreAllMocks();
  });

  it("超えたら 429・Retry-After・reason: rate_limited を返し、ログに残す", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createRateLimiter({ limit: 1, windowMs: 30_000, now: () => 0 });
    expect(rateLimitResponse(limiter, req(), "t")).toBeNull();
    const res = rateLimitResponse(limiter, req(), "t");
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("30");
    expect(await res?.json()).toMatchObject({ reason: "rate_limited" });
    expect(warn).toHaveBeenCalledWith("[t] rate limited", expect.stringContaining("retryAfterSec"));
    warn.mockRestore();
  });
});
