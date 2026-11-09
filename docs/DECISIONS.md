# 技術選定の記録

テーマ "Own the Why"（`docs/HACKATHON.md` 参照）に答えるための記録。
技術・サービス・ライブラリ・設計方針を選ぶ・変えるたびに1件追加する。

AI 開発セッション中の質問・回答・理由の記録は `docs/decisions/`（D-XXX とは別系統の判断ID）を参照。

## 運用ルール

- 技術・インフラの提案・決定・設定は **PM（山田）** が行う。
  AI エージェントは候補とメリット/デメリット・実装根拠を提供し、**未決定事項を勝手に確定しない**
- 「コード上に観測された現状」と「PM の正式決定」は分けて記録する。
  観測だけの項目は「正式決定: PM 確認待ち」と書き、確定したように見せない
- 案は2つ以上並べ、捨てた案も消さない
- 「なぜ」はプロダクトの目的・対象ユーザー・制約（短期間の開発、少額のクレジット、実行基盤の指定）に結びつける
- 人間が判断を変えたら、その理由も追記する
- 数値・統計・引用には出典を同じ行に付ける。根拠が見つからない項目は「（未記入: 要調査）」のまま残し、推測で埋めない

## 記録形式

```
## D-XXX: （決めたこと）

- 日付・決めた人:
- 背景・制約:
- 候補:

| 案 | メリット | デメリット |
| --- | --- | --- |
| A（採用） | | |
| B | | |

- 決定と理由:
- 捨てた案を選ばなかった理由:
```

---

以下は **2026-11-06 時点のコード調査で観測された現状**の記録。
正式な選定過程は未記録のため、「観測事実」と「PM 確認待ち」を分けている。

## D-001: アプリ基盤（Next.js + TypeScript + Tailwind）

- 観測事実: `package.json`（next 16.4.5 / react 19.3.0 / typescript / tailwindcss v4）、`next.config.ts`（cacheComponents、partialPrefetching、turbopack の Tailwind ルール）
- 正式決定: **PM 確認待ち**（選定時の候補比較は未記録）
- 候補（調査時点で考えられそうなもの・要 PM 確認）:

| 案 | メリット | デメリット |
| --- | --- | --- |
| Next.js（観測上の現行） | App Hosting の Next.js 対応・SSR/ルートハンドラで API を同居できる | （未記入: 要調査） |
| 他の SPA/SSG 構成 | （未記入: 要調査） | （未記入: 要調査） |

## D-002: 実行基盤（Firebase App Hosting 設定）

- 観測事実: `apphosting.yaml`（cpu 1 / memoryMiB 512 / minInstances 0 / maxInstances 2、`GEMINI_API_KEY` は Secret Manager 参照）。Firebase 関連の設定一式（`firebase.json`・`firestore.rules`・エミュレータ設定）あり
- 正式決定: **PM 確認待ち**。設定ファイルの存在は必須実行基盤（`docs/HACKATHON.md`）の候補を満たすが、**実際のデプロイ・公開 URL の実動は未確認**（`docs/STATUS.md`）
- 候補（大会必須の実行基盤から）:

| 案 | メリット | デメリット |
| --- | --- | --- |
| Firebase App Hosting（観測上の現行） | Next.js をそのままデプロイ、Secret Manager と統合 | 実デプロイ未確認。無料枠・クレジットでの継続稼働の確認が必要 |
| Cloud Run | 大会指定の実行基盤の候補（特性は未調査） | 未検証 |
| Firebase Hosting（静的） | 費用は要調査 | SSR/API ルートをそのままでは動かせない |

## D-003: Gemini の呼び出し方式（API キー方式・現状）

- 観測事実: `src/app/api/gemini/route.ts` は `https://generativelanguage.googleapis.com/v1beta/...:generateContent` を `x-goog-api-key`（`GEMINI_API_KEY`）で呼ぶ。**Gemini Developer API（API キー方式）であり、Vertex AI ではない**。モデル既定値 `gemini-2.5-flash`（`GEMINI_MODEL` で変更可）
- 正式決定: **PM 確認待ち**
- 注意: 転記元チームの方針は「Vertex AI 経由」（クレジットが AI Studio に適用されないため）。現行実装はそれと異なる方式であり、意図的な選択か未確認
- 候補:

| 案 | メリット | デメリット |
| --- | --- | --- |
| A. API キー方式（観測上の現行） | 設定が単純。ADC 不要 | 転記元チームは「クレジットが AI Studio に適用されない」ことを理由に Vertex を選択していた（公式必須ではない）。キーの管理・制限設定が必要 |
| B. Vertex AI（ADC / サービスアカウント） | Google Cloud クレジット対象（転記元の判断）。IAM で制御できる | 設定が複雑。ローカルは ADC セットアップが必要 |

## D-004: Storybook（開発補助ツール）

- 観測事実: `origin/main`（`44dda48`）には**存在しない**。`feat/sticker-ui` 系のブランチ（調査時点の SHA `4eccd717b59589f6a31020150b1b938f1a75b342`）に `.storybook/` と `*.stories.tsx`、`storybook` / `@storybook/nextjs-vite` の devDependencies がある
- 位置づけ: ローカルの UI カタログ・目視確認用の**開発補助**。デプロイ物でも審査の充足証拠でもない
- 正式決定: **PM 確認待ち**（main への取り込み可否を含む）

## 未確認事項（2026-11-06 時点・PM 確認待ち）

- 上記 D-001〜D-004 の正式決定（採否・理由の追認）
- プロダクトのカテゴリと仕様（大会必須。main に仕様・プロダクト UI がない）
- Gemini 呼び出し方式の確定（API キー維持か Vertex 移行か）
- デプロイの有無・公開 URL・Regional Day（転記では 11/14）までの継続稼働計画
- 会場区分（オンライン/現地）と提出物一式（説明ドキュメント・動画・著作物利用シート）の担当と進捗
- `.env.example` の不在（README が参照しているが main にファイルがない）
