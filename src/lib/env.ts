// デプロイ環境（stg / prod）とローカル開発の設定解決。
// 環境変数はこのモジュール内では直接読まず、呼び出し側が値を渡す。
// クライアント側では process.env.NEXT_PUBLIC_* の直接参照だけがビルド時に
// インライン化されるため、間接参照（process.env[name] 等）は使わないこと。

export type AppEnvironment = "local" | "stg" | "prod";

// App Hosting 上に作成済みの名前付き Firestore DB。環境名と 1:1 で対応させ、
// stg が誤って prod に繋がることをコード側でも防ぐ。
export const FIRESTORE_DATABASE_IDS = {
  stg: "yorimichi-stg",
  prod: "yorimichi-prod",
} as const;

/**
 * NEXT_PUBLIC_APP_ENV（未設定時は NODE_ENV）から実行環境を解決する。
 * - "stg" / "prod" / "local" 以外の明示値は常にエラー（タイプミスを黙殺しない）
 * - 未設定: production ビルドではエラー（fail closed）、それ以外は "local"
 */
export function resolveAppEnvironment(
  appEnv: string | undefined,
  nodeEnv: string | undefined,
): AppEnvironment {
  const normalized = appEnv?.trim().toLowerCase();
  if (!normalized) {
    if (nodeEnv === "production") {
      throw new Error(
        'NEXT_PUBLIC_APP_ENV が未設定です。本番デプロイでは apphosting.<env>.yaml で "stg" または "prod" を設定してください（ローカルの本番ビルドでは .env.local に "local" を設定）。',
      );
    }
    return "local";
  }
  if (
    normalized === "local" ||
    normalized === "stg" ||
    normalized === "prod"
  ) {
    return normalized;
  }
  throw new Error(
    `NEXT_PUBLIC_APP_ENV "${appEnv}" は無効です。"stg" / "prod" / "local" のいずれかを設定してください。`,
  );
}

/**
 * 環境に対応する Firestore データベース ID を解決する。
 * - stg / prod: 環境と一致する名前付き DB の指定を必須とし、
 *   不一致・未指定・(default) へのフォールバックはすべて拒否する
 * - local: 任意。指定があればその ID、なければ undefined（=(default) DB）
 */
export function resolveFirestoreDatabaseId(
  appEnv: AppEnvironment,
  databaseId: string | undefined,
): string | undefined {
  const normalized = databaseId?.trim();
  if (appEnv === "local") {
    return normalized || undefined;
  }
  const expected = FIRESTORE_DATABASE_IDS[appEnv];
  if (!normalized) {
    throw new Error(
      `NEXT_PUBLIC_APP_ENV が "${appEnv}" のとき NEXT_PUBLIC_FIREBASE_DATABASE_ID は必須です。"${expected}" を設定してください。`,
    );
  }
  if (normalized !== expected) {
    throw new Error(
      `NEXT_PUBLIC_FIREBASE_DATABASE_ID "${normalized}" は環境 "${appEnv}" と一致しません（"${expected}" が必須）。環境をまたいだデータアクセスを防ぐため接続を拒否しました。`,
    );
  }
  return normalized;
}

export interface FirebaseWebConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const REQUIRED_FIREBASE_WEB_CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "messagingSenderId",
  "appId",
] as const;

/**
 * デプロイ環境で Firebase Web 設定（公開値）の必須項目を検査する。
 * 欠けている場合は未設定キー名を列挙して失敗させる。
 * local ではエミュレータのみの利用を許すため検査しない。
 */
export function assertFirebaseWebConfig(
  config: FirebaseWebConfig,
  appEnv: AppEnvironment,
): void {
  if (appEnv === "local") return;
  const missing = REQUIRED_FIREBASE_WEB_CONFIG_KEYS.filter(
    (key) => !config[key]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `環境 "${appEnv}" の Firebase Web 設定が不足しています: ${missing.join(", ")}。apphosting.${appEnv}.yaml の env 設定を確認してください。`,
    );
  }
}
