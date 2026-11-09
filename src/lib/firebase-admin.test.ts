import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/app", () => ({
  applicationDefault: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn((options) => ({ options })),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn((_app, databaseId) => ({ databaseId })),
}));

beforeEach(() => {
  vi.stubEnv("FIRESTORE_EMULATOR_HOST", undefined);
  vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("Admin SDK environment routing", () => {
  it.each(["stg", "prod"])("selects the %s database", async (env) => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", env);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_DATABASE_ID", `yorimichi-${env}`);
    const { adminDb } = await import("./firebase-admin");
    expect(adminDb).toEqual({ databaseId: `yorimichi-${env}` });
  });

  it("routes the server to the emulator when the shared local flag is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "local");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATOR", "true");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_DATABASE_ID", undefined);
    await import("./firebase-admin");
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe("localhost:8080");
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBe("localhost:9099");
  });

  it("rejects local use without the emulator flag", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "local");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATOR", "false");
    await expect(import("./firebase-admin")).rejects.toThrow(/NEXT_PUBLIC_FIREBASE_EMULATOR/);
  });

  it("rejects a conflicting server emulator host", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "local");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATOR", "true");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "remote.example:8080");
    await expect(import("./firebase-admin")).rejects.toThrow(/FIRESTORE_EMULATOR_HOST/);
  });
});
