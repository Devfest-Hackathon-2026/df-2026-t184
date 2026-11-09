# プロンプト調整ガイド（上田さん向け）

## 直す場所
`src/lib/prompts/quests.ts` の「ルール」の文章だけ。

- `<destination>` と、`` ` `` の外のコードは触らない
- 文章の中に `` ` `` や `${` は書かない

## 試し方
1. `npm run dev` → `http://localhost:3000`
2. 目的地・気分を選んで「寄り道ルートを作る」
3. 保存すれば、次の生成から新しい指示になる

※ Gemini は Vertex AI 経由で呼ぶ。ローカルでは一度だけ `gcloud auth application-default login` を実行し、`.env.local` に `VERTEX_PROJECT_ID=df-2026-t184-prod` を入れる（`.env.example` を参照）。

## 試す入力
- 上野公園 / 静けさ優先 / +20分
- 浅草寺 / レトロ / +20分
- 谷中銀座 / ローカルグルメ / +10分

## 見るところ
- 3つとも実在する場所か（地図で検索）
- 気分に合っているか
- 夜道や危ない場所を勧めていないか

直したら「変えた点・理由・結果」を Discord に一言。
