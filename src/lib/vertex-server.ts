import "server-only";
import { applicationDefault } from "firebase-admin/app";

import { createVertexClient, type VertexClient } from "./vertex";

// App Hosting では実行用サービスアカウント（roles/aiplatform.user）、ローカルでは
// `gcloud auth application-default login` の認証情報が使われる。
const credential = applicationDefault();

// gemini-2.5-flash は Vertex AI で 2026-10 に提供終了。安い後継の flash-lite を既定にする（GEMINI_MODEL で変更可）。
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_LOCATION = "global";

/** サーバーの環境変数から Vertex AI のクライアントを作る。プロジェクトが決まらなければ null。 */
export const vertexFromEnv = (): VertexClient | null => {
  const project = process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!project) return null;
  return createVertexClient({
    project,
    location: process.env.VERTEX_LOCATION || DEFAULT_LOCATION,
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    getAccessToken: async () => (await credential.getAccessToken()).access_token,
  });
};
