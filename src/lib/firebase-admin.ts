import "server-only";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  assertLocalEmulator,
  resolveAppEnvironment,
  resolveFirestoreDatabaseId,
} from "@/lib/env";

// サーバー側専用。App Hosting / Cloud Run 上では実行環境の認証情報が自動で使われる。
// 実DBに接続する開発者は `gcloud auth application-default login` を実行する。
// local では共通フラグからAdmin SDKのエミュレータ接続先も設定する。
//
// DB の選択はクライアント SDK と同じ NEXT_PUBLIC_FIREBASE_DATABASE_ID を使い、
// Firebaseモジュール読み込み時に stg / prod のDB名との一致を検査する。
const appEnvironment = resolveAppEnvironment(
  process.env.NEXT_PUBLIC_APP_ENV,
  process.env.NODE_ENV,
);
assertLocalEmulator(appEnvironment, process.env.NEXT_PUBLIC_FIREBASE_EMULATOR);
if (appEnvironment === "local") {
  for (const [name, host] of [
    ["FIRESTORE_EMULATOR_HOST", "localhost:8080"],
    ["FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099"],
  ]) {
    if (process.env[name] && process.env[name] !== host) {
      throw new Error(`${name} は ${host} に設定してください。ブラウザとサーバーの接続先を一致させる必要があります。`);
    }
    process.env[name] = host;
  }
}
const firestoreDatabaseId = resolveFirestoreDatabaseId(
  appEnvironment,
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID,
);

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      ...(appEnvironment === "local" ? {} : { credential: applicationDefault() }),
      projectId:
        appEnvironment === "local"
          ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-yorimichi"
          : process.env.GOOGLE_CLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

export const adminDb = firestoreDatabaseId
  ? getFirestore(adminApp, firestoreDatabaseId)
  : getFirestore(adminApp);
