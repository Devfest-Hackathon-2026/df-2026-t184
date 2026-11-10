// Vertex AI の Gemini を呼ぶ。認証は API キーではなく、実行環境の認証情報（ADC）のアクセストークン。
// 請求は Google Cloud の請求先アカウントに付くため、Cloud のクレジット（クーポン）が使える。

export class VertexAuthError extends Error {
  constructor(cause: unknown) {
    super("Vertex AI の認証情報を取得できませんでした。ローカルでは `gcloud auth application-default login` を実行してください。", { cause });
    this.name = "VertexAuthError";
  }
}

type VertexClientOptions = {
  project: string;
  /** "global" か、asia-northeast1 などのリージョン。 */
  location: string;
  model: string;
  getAccessToken: () => Promise<string>;
  fetch?: typeof fetch;
};

export type VertexClient = {
  /** ログに出すためのモデル名。 */
  model: string;
  generateContent: (body: unknown, init?: { signal?: AbortSignal }) => Promise<Response>;
};

const hostOf = (location: string): string =>
  location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;

export const createVertexClient = ({ project, location, model, getAccessToken, fetch: fetchFn = fetch }: VertexClientOptions): VertexClient => {
  const url = `https://${hostOf(location)}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
  return {
    model,
    async generateContent(body, init) {
      let token: string;
      try {
        token = await getAccessToken();
      } catch (e) {
        throw new VertexAuthError(e);
      }
      return fetchFn(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: init?.signal,
      });
    },
  };
};
