# 実装状況メモ（コード調査ベース）

確認日: **2026-11-06**。調査対象: `origin/main` = `44dda48919066d6514b7c4f71b94a19a9e64c14e`。
以下はすべてコード・設定ファイルを読んで確認した**観測事実**であり、PM の正式確認は別途必要。

## 観測事実（origin/main）

- 基盤: Next.js 16.4.5 / React 19.3.0 / TypeScript / Tailwind CSS v4（turbopack）
- `src/app/page.tsx`: create-next-app の雛形のまま。**プロダクトの UI は main にない**
- `src/app/api/gemini/route.ts`:
  - `POST {prompt}` → `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` を `x-goog-api-key` ヘッダ（`GEMINI_API_KEY`）で呼ぶ
  - **Gemini Developer API（API キー方式）で、Vertex AI ではない**
  - 認証・レート制限なし（コード内コメントも「本番では認証・レート制限を必ず付けること」と記述）
  - main の UI からこのエンドポイントを呼ぶコードは**存在しない**
- `src/lib/firebase.ts`: クライアント SDK 初期化（Auth / Firestore）を export。**main 内で import しているコードはない**
- `src/lib/firebase-admin.ts`: Admin SDK（`applicationDefault()`）で `adminDb` を export。**main 内で import しているコードはない**
- `apphosting.yaml`: Firebase App Hosting 用の設定（runConfig: cpu 1 / 512MiB / min 0 / max 2、`GEMINI_API_KEY` は Secret Manager 参照）。**実際にデプロイ済みかはリポジトリからは確認できない**
- `firestore.rules`: 既定全拒否 + `users/{uid}` は本人のみ read/write
- `firebase.json`: Firestore rules/indexes + Auth(9099)/Firestore(8080) エミュレータ設定
- CI（`.github/workflows/ci.yml`）: lint + build（Firebase 系 env はダミー値）+ gitleaks
- README は `cp .env.example .env.local` を案内しているが、**`.env.example` は main に存在しない**
- main にテスト基盤なし（vitest 設定・`npm test` は `feat/sticker-ui` 系ブランチ上の追加）

## Storybook の位置づけ

- `origin/main`（`44dda48`）には **Storybook は存在しない**
  （`.storybook/`・`*.stories.tsx`・storybook 系 devDependencies なし）
- `feat/sticker-ui` 系ブランチ（**調査時点の SHA `4eccd717b59589f6a31020150b1b938f1a75b342`**）には
  `.storybook/`・複数の `*.stories.tsx`・`storybook` / `@storybook/nextjs-vite` devDeps・`npm run storybook` スクリプト（port 6006）がある
- Storybook は**ローカルでの UI 開発・目視確認の補助ツール**。
  大会の必須要件（指定された Google 実行基盤でアプリが動くこと、`docs/HACKATHON.md`）の**充足証拠ではない**。
  ローカルで Storybook が動いても、必須実行基盤へのデプロイ・実動を示さない

## 大会必須項目に対する観測（判定ではなく事実の対応付け）

| 必須項目（転記） | 観測された状態 | 状態 |
| --- | --- | --- |
| カテゴリに入るプロダクト | main にプロダクト仕様・UI なし | 未確定 |
| 指定実行基盤での実行 | App Hosting 設定ファイルあり、実デプロイ未確認 | 未確認 |
| メイン技術は Google 技術 | Firebase・Gemini のコードあり、ただし未接続 | 一部観測 |
| 秘密情報をコミットしない | env 変数経由・Secret Manager 参照・gitleaks CI。コミット済み秘密は本調査で未検出 | おおむね良好（PM 最終確認） |
| 提出物一式 | 説明ドキュメント・動画・著作物利用シートの整備なし | 未整備 |

## 不足しているもの（コードから観測）

- UI から `/api/gemini` を呼ぶ実際の API 連携
- Firebase Auth のサインイン処理・Firestore の読み書き（初期化コードのみで使用箇所なし）
- `/api/gemini` への認証・レート制限
- `.env.example`
- デプロイ URL と稼働確認の記録
- テスト（main 上。feat/sticker-ui 系には vitest 基盤あり）
