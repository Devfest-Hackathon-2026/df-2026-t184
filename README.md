# df-2026-t184-dev

DevFest GDGoC Japan Hackathon 2026（チーム t184）の**開発用**リポジトリ。
提出用の公開リポジトリは `Devfest-Hackathon-2026/df-2026-t184`。**提出時は最終版のコードと資料だけを、履歴を持ち込まずにコピーする。**

## 構成
- Next.js（App Router / TypeScript / Tailwind）
- Firebase（Auth / Firestore / App Hosting）
- Gemini API（`src/app/api/gemini/route.ts`、キーはサーバー側のみ）

## ドキュメント

| ファイル | 内容 |
|---|---|
| `docs/HACKATHON.md` | ハッカソンの前提・必須ルール（二次資料の転記。公式原本とは未照合） |
| `docs/REQUIREMENTS.md` | 要件仮説草案（仮説モック用。確定要件ではない） |
| `docs/DECISIONS.md` | 技術選定の記録と未確認事項 |
| `docs/decisions/` | AI開発時の質問・回答・理由の判断記録（`.agents/skills/own-the-why` 参照） |
| `docs/STATUS.md` | 実装状況の観測メモ（コード調査ベース） |

AI エージェントはまずこれらを読むこと（`AGENTS.md` 参照）。

## セットアップ
```bash
npm install
cp .env.example .env.local   # 値を入れる（.env.local はコミットしない）
npm run dev
```

Firebase CLI（初回のみ）:
```bash
npm i -g firebase-tools
firebase login
firebase use --add            # プロジェクトを選ぶ（.firebaserc が作られる）
firebase emulators:start      # Auth / Firestore エミュレータ
```

## 実行方法

| コマンド | 内容 |
|---|---|
| `npm run dev` | Next.js の開発サーバー（`/` に寄り道コンパスの画面遷移） |
| `npm test` | vitest によるフロー・画面の操作テスト |
| `npm run lint` | ESLint |
| `npm run storybook` | Storybook（port 6006。ローカルの UI 確認用） |
| `npm run build-storybook` | Storybook の静的ビルド（`storybook-static/`） |

## 仮説モック（Storybook）

`docs/REQUIREMENTS.md` の仮説草案を触って評価するためのモック。
Storybook の **Hypothesis/仮説モック WalkApp** に 2 つの story がある。

- **場面A: 日常の寄り道** — 日常の徒歩移動で寄り道先を決められない人向け
- **場面B: 観光での寄り道** — 観光地の空き時間に自分好みの場所を探したい旅行者向け

各 story の外枠に対象・困りごと・期待変化・評価質問と見本データの注意を表示し、
その下で既存の寄り道→記録→思い出カード→ともだちの投稿までを一通り触れる。
表示データはすべて見本。バックエンド・Google API 連携は含まない。

## 秘密情報のルール
- `.env.local`、サービスアカウント鍵、API キーは**絶対にコミットしない**。`.env.example` には変数名だけ書く。
- Gemini のキーは `GEMINI_API_KEY`（`NEXT_PUBLIC_` を付けない）。本番は Secret Manager に置く。
- `NEXT_PUBLIC_FIREBASE_*` は公開される設定値。守るのは Firestore ルールと Auth。
- CI で gitleaks を回している。ローカルの pre-commit も有効。

## ブランチ運用
`main` に直接 push せず、`feat/<内容>` → PR → 1人レビューで merge。

## 役割
| 担当 | 主な役割 |
|---|---|
| クマタニ | 技術リード（FE/BE・Gemini 連携） |
| 山田 | PM・企画・発表資料・LP・QA。**技術・インフラの提案・決定・設定は PM が行う**（AI エージェントは候補と根拠の提示まで。`AGENTS.md`・`docs/DECISIONS.md` 参照） |
| 上田 | UI 部品・テスト・README/デモ台本 |
