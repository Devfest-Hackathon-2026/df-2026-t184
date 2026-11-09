# df-2026-t184-dev

DevFest GDGoC Japan Hackathon 2026（チーム t184）の**開発用**リポジトリ。
提出用の公開リポジトリは `Devfest-Hackathon-2026/df-2026-t184`。**提出時は最終版のコードと資料だけを、履歴を持ち込まずにコピーする。**

## 構成
- Next.js（App Router / TypeScript / Tailwind）
- Firebase（Auth / Firestore / App Hosting）
- Gemini API（`src/app/api/gemini/route.ts`、キーはサーバー側のみ）

## 環境
- stg / prod の構成・デプロイ方法は [docs/environments.md](docs/environments.md) を参照。

## ドキュメント

| ファイル | 内容 |
|---|---|
| `docs/HACKATHON.md` | ハッカソンの前提・必須ルール（二次資料の転記。公式原本とは未照合） |
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
firebase emulators:start --config firebase.emulator.json --project demo-yorimichi # Auth / Firestore エミュレータ
```

## Google Maps
- `.env.local` に `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` を入れる（未設定ならSVGのサンプル地図で動く）。
- このキーはブラウザに公開される。Cloud Console で **HTTP リファラー制限**（localhost と本番URL）と、**Maps JavaScript API / Geocoding API のみ**に絞ること。
- 位置情報が使えない時の出発地は東京駅、目的地が見つからない時は上野公園付近。

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
| 山田 | PM・企画・発表資料・LP・QA |
| 上田 | UI 部品・テスト・README/デモ台本 |
