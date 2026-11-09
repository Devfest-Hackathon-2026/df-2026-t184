import { deleteApp, getApps } from "firebase/app";
import { afterEach, describe, expect, it, vi } from "vitest";

// src/lib/firebase.ts が env.ts の解決を実際に通しているかの結線テスト。
// モジュール読み込み時に評価されるため、import 前に環境変数をスタブする。

const STG_ENV = {
  NEXT_PUBLIC_APP_ENV: "stg",
  NEXT_PUBLIC_FIREBASE_DATABASE_ID: "yorimichi-stg",
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "df-2026-t184-prod.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "df-2026-t184-prod",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1031159186960",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:1031159186960:web:98001fdfed19e46405ec95",
};

afterEach(async () => {
  await Promise.all(getApps().map(deleteApp));
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("firebase.ts の環境結線", () => {
  it("production で APP_ENV が未設定ならモジュール評価が失敗する", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "");
    await expect(import("./firebase")).rejects.toThrow(/NEXT_PUBLIC_APP_ENV/);
  });

  it("stg で prod の DB ID を指定するとモジュール評価が失敗する", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const [k, v] of Object.entries(STG_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_DATABASE_ID", "yorimichi-prod");
    await expect(import("./firebase")).rejects.toThrow(/yorimichi-stg/);
  });

  it("stg の正しい設定では stg 環境・stg DB で初期化される", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const [k, v] of Object.entries(STG_ENV)) vi.stubEnv(k, v);
    const mod = await import("./firebase");
    expect(mod.appEnvironment).toBe("stg");
    expect(mod.app.options.projectId).toBe("df-2026-t184-prod");
    // Firestore の接続先 DB を確認（SDK 内部フィールドだが、誤配線の検出用）
    const dbId = (mod.db as unknown as { _databaseId?: { database?: string } })
      ._databaseId?.database;
    expect(dbId).toBe("yorimichi-stg");
  });
});

it("initializes local emulators without real Firebase credentials", async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", "local");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATOR", "true");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_DATABASE_ID", undefined);
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
  const mod = await import("./firebase");
  expect(mod.app.options.apiKey).toBe("demo-key");
  expect(mod.app.options.projectId).toBe("demo-yorimichi");
  expect(mod.auth.emulatorConfig?.host).toBe("localhost");
});
