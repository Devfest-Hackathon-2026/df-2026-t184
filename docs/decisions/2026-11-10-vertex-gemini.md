# 2026-11-10-vertex-gemini: Gemini の呼び出しを Vertex AI に切り替える

- 日付: 2026-11-10
- セッション参照: Claude Code（T3 Code 経由）の会話。スレッドID・メッセージID: 未取得
- 質問手段: チャットでの選択肢の提示（A: Vertex AI に変える / B: 前払いクレジットを買う / C: 今は Gemini なし）
- 深さ: 短い確認のみ
- 関連: `docs/DECISIONS.md` の D-003

## 経緯（コードと画面から観測した事実）

- ローカルで `/api/quests` が 502 を返し、サーバーのログに `gemini error 402` が出た
- 本人が貼った AI Studio の API キーの画面では、`yorimichi-prod-gemini` と `yorimichi-stg-gemini` が同じプロジェクト `df-2026-t184-prod` にあり、請求階層は「Tier 1・後払い」で「前払いを設定」と表示されていた
- 「前払いを設定」から進むと、クレジット購入の画面（最小 ¥800、払い戻しなし）になり、配布されたクーポンを入れる場所はなかった
- Gemini API の課金ページには、前払いの残高が 0 だと請求先アカウントにつながる全キーが 402 で止まること、Google Cloud のクレジットは AI Studio の Gemini API には適用されないことが書かれている（https://ai.google.dev/gemini-api/docs/billing 、2026-11-10 参照）

## Q: どの方式で Gemini を使うか

本人の発言（引用）:

> 基本的には発行されているクレジット用のクーポンを使用したいのですが

> 含まれていたはずなので、vertexの前提で一気に対応しましょうか
> そしたらgws cliとかも使用できるはずなので

- 回答: Vertex AI に切り替える（D-003 の案 B）
- 選定理由: 本人の発言から、配布されたクーポン（Google Cloud のクレジット）を使うため。クレジットの対象サービスに Vertex AI が含まれている、というのは本人の認識で、AI は請求画面を直接確認していない
- 本人が挙げた gws は Google Workspace 用の CLI だったので、Google Cloud の操作には gcloud を使った（アカウントとプロジェクトはコマンドごとに指定し、gcloud の既定設定は変えていない）

## AI の実装判断

- `src/lib/vertex.ts`: Vertex AI の `generateContent` を、ADC のアクセストークンで呼ぶ。場所が `global` なら `aiplatform.googleapis.com`、リージョンなら `<region>-aiplatform.googleapis.com`
- `src/lib/vertex-server.ts`: トークンは既存の `firebase-admin` の `applicationDefault()` から取る（`cloud-platform` スコープを含む）。新しい依存は追加していない
- プロジェクトは `VERTEX_PROJECT_ID` → `GOOGLE_CLOUD_PROJECT` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID` の順に決める。stg・prod は既存の `NEXT_PUBLIC_FIREBASE_PROJECT_ID` を使うので、App Hosting に新しい変数は足していない
- `apphosting.stg.yaml` / `apphosting.prod.yaml` から `GEMINI_API_KEY` の参照を外した。Secret Manager の `STG_/PROD_GEMINI_API_KEY` の値は消していない（削除は別に判断する）

## Google Cloud 側で行った変更

- `yorimichi-stg@df-2026-t184-prod.iam.gserviceaccount.com` と `yorimichi-prod@df-2026-t184-prod.iam.gserviceaccount.com` に `roles/aiplatform.user` をプロジェクト単位で付与した（2026-11-10、`yamadamei0512@gmail.com` で実行）
- `aiplatform.googleapis.com` はすでに有効だった

## 追記: 既定のモデル

- ローカルで ADC（本人が `gcloud auth application-default login` を実行）を使って `/api/quests` を呼ぶと、Vertex AI が 404 を返した。理由は「`gemini-2.5-flash` が見つからないか、アクセスできない」
- Vertex AI では `gemini-2.5-flash` が 2026-10 に提供終了していた（https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions 、2026-11-10 参照。Gemini API 側は対象外とされる）
- AI の判断: 既定を後継候補のうち安い `gemini-3.5-flash-lite` にした。`GEMINI_MODEL` で `gemini-3.8-flash` などに変えられる
- 失敗時に Vertex AI の応答本文（先頭 500 文字）をサーバーのログに出すようにした（原因の調査のため）
- 確認: `gemini-3.5-flash-lite` で `/api/quests` が 200 を返し、上野公園の周辺の地点（下谷神社・小野照崎神社・寛永寺旧本坊表門）でクエストが作られた

## 結果・検証

- `src/lib/vertex.test.ts` を先に書いて失敗を確認し、実装後に全 64 テストが成功。`tsc --noEmit`・ESLint・CI と同じダミー環境変数での `next build` も成功
- ローカル（本人の ADC）で実際の Vertex AI への呼び出しが成功したことを確認した（上の「既定のモデル」を参照）
- stg: PR https://github.com/shun-os/df-2026-t184/pull/30 のデプロイ後、stg の `/api/quests` が 200 を返し、谷中銀座の周辺の地点（全生庵・初音小路飲食店街・朝倉彫塑館周辺の路地）でクエストが作られた。stg の実行用サービスアカウントで Vertex AI を呼べることを確認した
- 未検証: prod の実行用サービスアカウントでの呼び出し（main へのマージと prod デプロイの後に確認する）
