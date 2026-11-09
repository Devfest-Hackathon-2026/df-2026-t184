import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import {
  assertFirebaseWebConfig,
  resolveAppEnvironment,
  resolveFirestoreDatabaseId,
} from "@/lib/env";

// NEXT_PUBLIC_ の値はブラウザに公開される前提の設定値（秘密ではない）。
// セキュリティは Firestore ルールと Auth で担保する。
// process.env.NEXT_PUBLIC_* は直接参照すること（ビルド時に値がインライン化される）。
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// デプロイ環境では APP_ENV と DB ID が必須かつ整合していることだけを許す。
// 未設定・不一致の場合はここで例外になり、意図しない DB（例: stg→prod）への
// 接続を防ぐ（fail closed）。ローカルでは未設定でも動く。
export const appEnvironment = resolveAppEnvironment(
  process.env.NEXT_PUBLIC_APP_ENV,
  process.env.NODE_ENV,
);
assertFirebaseWebConfig(firebaseConfig, appEnvironment);
const firestoreDatabaseId = resolveFirestoreDatabaseId(
  appEnvironment,
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID,
);

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);

// ローカル開発でエミュレータを使う場合は .env.local に
// NEXT_PUBLIC_FIREBASE_EMULATOR=true を設定する（firebase emulators:start 併用）。
if (
  appEnvironment === "local" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true"
) {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
}
