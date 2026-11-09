import { describe, expect, it } from "vitest";

import {
  assertFirebaseWebConfig,
  FIRESTORE_DATABASE_IDS,
  resolveAppEnvironment,
  resolveFirestoreDatabaseId,
} from "./env";

describe("resolveAppEnvironment", () => {
  it("returns the explicit value for stg / prod / local", () => {
    expect(resolveAppEnvironment("stg", "production")).toBe("stg");
    expect(resolveAppEnvironment("prod", "production")).toBe("prod");
    expect(resolveAppEnvironment("local", "production")).toBe("local");
  });

  it("normalizes surrounding whitespace and case", () => {
    expect(resolveAppEnvironment("  STG ", "development")).toBe("stg");
  });

  it("defaults to local outside production when unset", () => {
    expect(resolveAppEnvironment(undefined, "development")).toBe("local");
    expect(resolveAppEnvironment("", "test")).toBe("local");
    expect(resolveAppEnvironment(undefined, undefined)).toBe("local");
  });

  it("throws in production when unset (fail closed)", () => {
    expect(() => resolveAppEnvironment(undefined, "production")).toThrow(
      /NEXT_PUBLIC_APP_ENV/,
    );
  });

  it("throws on invalid values even outside production", () => {
    expect(() => resolveAppEnvironment("staging", "development")).toThrow(
      /NEXT_PUBLIC_APP_ENV/,
    );
    expect(() => resolveAppEnvironment("prd", "production")).toThrow();
  });
});

describe("resolveFirestoreDatabaseId", () => {
  it("requires the stg database in stg", () => {
    expect(
      resolveFirestoreDatabaseId("stg", FIRESTORE_DATABASE_IDS.stg),
    ).toBe(FIRESTORE_DATABASE_IDS.stg);
  });

  it("requires the prod database in prod", () => {
    expect(
      resolveFirestoreDatabaseId("prod", FIRESTORE_DATABASE_IDS.prod),
    ).toBe(FIRESTORE_DATABASE_IDS.prod);
  });

  it("never lets stg fall back to prod or the default database", () => {
    expect(() =>
      resolveFirestoreDatabaseId("stg", FIRESTORE_DATABASE_IDS.prod),
    ).toThrow(/yorimichi-stg/);
    expect(() => resolveFirestoreDatabaseId("stg", undefined)).toThrow(
      /NEXT_PUBLIC_FIREBASE_DATABASE_ID/,
    );
    expect(() => resolveFirestoreDatabaseId("stg", "(default)")).toThrow();
  });

  it("never lets prod point at the stg database", () => {
    expect(() =>
      resolveFirestoreDatabaseId("prod", FIRESTORE_DATABASE_IDS.stg),
    ).toThrow(/yorimichi-prod/);
    expect(() => resolveFirestoreDatabaseId("prod", undefined)).toThrow();
  });

  it("is optional in local and passes an explicit value through", () => {
    expect(resolveFirestoreDatabaseId("local", undefined)).toBeUndefined();
    expect(resolveFirestoreDatabaseId("local", "")).toBeUndefined();
    expect(resolveFirestoreDatabaseId("local", "yorimichi-stg")).toBe(
      "yorimichi-stg",
    );
    expect(resolveFirestoreDatabaseId("local", "demo-db")).toBe("demo-db");
  });
});

describe("assertFirebaseWebConfig", () => {
  const complete = {
    apiKey: "key",
    authDomain: "df-2026-t184-prod.firebaseapp.com",
    projectId: "df-2026-t184-prod",
    messagingSenderId: "1031159186960",
    appId: "1:1031159186960:web:98001fdfed19e46405ec95",
  };

  it("accepts a complete deployed-environment config", () => {
    expect(() => assertFirebaseWebConfig(complete, "stg")).not.toThrow();
    expect(() => assertFirebaseWebConfig(complete, "prod")).not.toThrow();
  });

  it("throws listing every missing key in deployed environments", () => {
    expect(() =>
      assertFirebaseWebConfig(
        { apiKey: "key", projectId: "df-2026-t184-prod" },
        "prod",
      ),
    ).toThrow(/authDomain[\s\S]*messagingSenderId[\s\S]*appId/);
  });

  it("does not require the web config in local (emulator-only dev works)", () => {
    expect(() => assertFirebaseWebConfig({}, "local")).not.toThrow();
  });
});
