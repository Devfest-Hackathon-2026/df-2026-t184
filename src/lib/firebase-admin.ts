import "server-only";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// サーバー側専用。App Hosting / Cloud Run 上では実行環境の認証情報が自動で使われる。
// ローカルでは `gcloud auth application-default login` を実行しておく。
const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: applicationDefault() });

export const adminDb = getFirestore(adminApp);
