# 寄り道コンパス（df-2026-t184）

DevFest GDGoC Japan Hackathon 2026（チーム t184）の**最終提出用**リポジトリ。開発は別の private リポジトリで行い、その main を履歴ごと取り込んでいる。

## デプロイ URL

- 本番: https://yorimichi-prod--df-2026-t184-prod.asia-east1.hosted.app/walk

## 構成
- Next.js（App Router / TypeScript / Tailwind）
- Firebase（Auth / Firestore / App Hosting）
- Gemini（Vertex AI、`src/app/api/quests/route.ts`。認証は実行環境の ADC で、キーはクライアントに渡さない）

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
- このキーはブラウザに公開される。Cloud Console で **HTTP リファラー制限**（localhost と本番URL）と、**Maps JavaScript API / Geocoding API / Routes API のみ**に絞ること。
- 位置情報が使えない時の出発地は東京駅、目的地が見つからない時は上野公園付近。
- 経路は Routes API（徒歩）で道に沿って引く。取れない時（API未有効・キー制限・上限超え）は直線で表示する。

### 使いすぎ防止の上限（クォータ）
クレジットは大会用の $20（約3,000円）。予算アラートは通知だけで自動では止まらないので、API ごとに1日の上限を付けている（プロジェクト `df-2026-t184-prod`）。

| API | 設定した上限 | 状態 |
|---|---|---|
| Geocoding API（v3） | 1日 1,500 / 1分 100 | 設定済み |
| Maps JavaScript API | 地図の読み込み 1日 300 / 1分 30。3D地図は 1日 0 / 1分 10 | 設定済み |
| Routes API（ComputeRoutes） | 1日 600 / 1分 30（1人あたり1分 30） | 設定済み |
| Gemini（本番キー） | Cloud側では1日の上限を付けられない（あるのは地域ごとの1分の枠だけ） | アプリ側の回数制限（PR #7・#8）で守る |

- 上限に達すると、その機能だけ止まる（地図は直線、チェックポイントは仮の位置、クエストはサンプルに戻る）。アプリ全体は止まらない。
- 数字は審査中の利用を1日100回程度と見た案。足りなければチーム3人で相談して上げる。
- クレジットを使い切った時は、3人の合意でクレジットを追加し、あとで割り勘にする。

## 実行方法

| コマンド | 内容 |
|---|---|
| `npm run dev` | Next.js の開発サーバー（`/` に寄り道コンパス本体） |
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
- Gemini は Vertex AI 経由で、実行環境の認証（ADC）で呼ぶ。API キーは使わない。ローカルは `gcloud auth application-default login`。
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
