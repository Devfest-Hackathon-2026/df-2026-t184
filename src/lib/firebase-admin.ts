import "server-only";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  resolveAppEnvironment,
  resolveFirestoreDatabaseId,
} from "@/lib/env";

// サーバー側専用。App Hosting / Cloud Run 上では実行環境の認証情報が自動で使われる。
// ローカルでは `gcloud auth application-default login` を実行しておく。
// エミュレータ利用時は FIRESTORE_EMULATOR_HOST が admin SDK に自動で効く。
//
// DB の選択はクライアント SDK と同じ NEXT_PUBLIC_FIREBASE_DATABASE_ID を使い、
// stg / prod の環境名との一致を強制する（不整合なら起動時に失敗＝fail closed）。
const appEnvironment = resolveAppEnvironment(
  process.env.NEXT_PUBLIC_APP_ENV,
  process.env.NODE_ENV,
);
const firestoreDatabaseId = resolveFirestoreDatabaseId(
  appEnvironment,
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID,
);

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
      projectId:
        process.env.GOOGLE_CLOUD_PROJECT ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

export const adminDb = firestoreDatabaseId
  ? getFirestore(adminApp, firestoreDatabaseId)
  : getFirestore(adminApp);
