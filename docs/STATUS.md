# 実装状況メモ（コード調査ベース）

確認日: **2026-11-10**。調査対象: superloop 統合ブランチ `1d162bc`（F01〜F09 すべて評価 PASS、`test-results.json`）。
以下はすべてコード・設定ファイルを読んで確認した**観測事実**であり、PM の正式確認は別途必要。
デモの進め方は `docs/DEMO.md`、起動・テスト手順は `docs/RUNBOOK.md` を参照。

## 観測事実（現在のコード）

- 基盤: Next.js 16.4.5 / React 19.3.0 / TypeScript / Tailwind CSS v4（turbopack）
- `src/app/page.tsx`: `/` → `/walk` へ `redirect()`（307）。プロダクトの UI は `src/features/walk/`
- `src/app/walk/page.tsx`: `WalkApp` を `live onboarding` で描画（Gemini・Google Maps を使い、失敗・キーなしは見本・手描き地図に切り替わる）
- `src/app/terrain/page.tsx`: `TerrainCompare`（上野公園〜谷中〜鶯谷の固定デモ経路で、最短ルートと寄り道ルートの坂・日陰の推定値を比較）
- `src/app/prompt-lab/page.tsx`: プロンプト調整ページ（`/api/quests` を試す内部向け画面）
- `src/app/api/quests/route.ts`:
  - `POST {dest, mood, budget}`（mood・budget は添字、文言はサーバー側で固定）→ `generateQuests` で Vertex AI の Gemini を呼び、3地点のクエストを JSON スキーマで受け取る（`src/lib/quest-generation.ts`・`src/lib/prompts/quests.ts`）
  - 入力検証: dest は 60 字まで・`<` `>` を除去、mood/budget は表の範囲内のみ。超過は 400
  - 失敗は原因（`QuestFailure`: timeout / invalid_output / upstream / config / network / rate_limited）つきで `{ error, reason }` を返し、原因をサーバーログに残す。時間切れの上限はサーバー 20 秒・ブラウザ 25 秒
  - IP ごとの回数制限（メモリ内・1分60回、超過で 429 + `Retry-After`）。接続元は stg/prod で `x-fah-client-ip`、local では全員共通キー（`src/lib/rate-limit.ts`）
- `/api/gemini`（`{prompt}` を Gemini にそのまま渡すサンプル）は、画面から使われず課金の窓口になるため 2026-11-10 に削除した（`docs/decisions/2026-11-10-panel-fixes.md`）
- `src/lib/vertex*.ts`: Vertex AI `generateContent` を ADC のアクセストークンで呼ぶ（API キー方式は廃止、D-003）。既定モデル `gemini-3.5-flash-lite`（`GEMINI_MODEL` で変更可。`gemini-2.5-flash` は Vertex AI で提供終了のため）
- `/walk` の流れ: 入力（行き先・気分・寄り道時間）→ 探索の演出 → ルート（地図＋3地点のクエスト）→ 各地点で「見つけた」・写真枠・メモ → 思い出カード → ハンコ帳（ポイント・称号）・アルバム・フィード
- 見本・推定値の区別表示（失格条件対応）: AI生成/見本/フォールバック原因の知らせ（`RouteScreen.tsx`）、探索段階は演出の注記（`LoadingScreen.tsx`）、所要時間は目安の注記（`EtaNote.tsx`）、カードの文章・写真は見本の注記（`MemoryCard.tsx`）、フィードは見本の注記（`FeedScreen.tsx`）、ポイント非保存の注記（`points.ts`）
- `/terrain`: Routes API（徒歩）で表示のたびに経路を取得（保存しない。失敗時は直線＋警告）。標高は国土地理院標高タイル・日陰は PLATEAU 台東区＋NOAA 太陽位置式の事前計算グリッド（`public/terrain/`、出典は `docs/ASSETS.md`・`scripts/terrain/README.md`）。欠損・範囲外は「不明区間」として出し、通行可否は保証しない旨を画面に記載
- ポイント・称号（`src/features/walk/points.ts`・`badges.ts`）: 達成・写真・メモ・完走で加算し称号を付与。保存はせずリロードで消える旨を表示。見本の記録はポイントに数えない
- アクセシビリティ（F07）: キーボードのみで全画面を通せる。画面遷移で見出しへフォーカス移動、操作要素に role・名前。jsdom テストあり（`src/features/walk/a11y.test.tsx`・`focus.test.tsx`）
- テスト基盤: Vitest 5 + jsdom + testing-library（`vitest.config.mts`）。`npm test` に `/walk` の3通りの通しテスト・API・地形グリッド生成スクリプトのテストを含む
- `src/lib/firebase.ts` / `firebase-admin.ts`: クライアント・Admin SDK の初期化を export。**現在の画面・API から使っているコードはない**（保存・ログインは後回し）
- `firestore.rules`: 全拒否。Firestore の読み書きは未実装
- stg: `yorimichi-stg--df-2026-t184-prod.asia-east1.hosted.app` にデプロイ・実動確認済み（2026-11-10。Vertex AI で `/api/quests` 成功、回数制限の IP 別実測も確認。`docs/decisions/2026-11-10-stg-tag-deploy-verification.md`・`evidence/F04/`）。ただし現在の stg のビルドは F08/F09 取り込み前で `/terrain` は 404（2026-11-10 12時台に curl で観測。最新は次のデプロイで反映）
- prod: デプロイ・実動確認は未実施（main merge → CI 成功で `yorimichi-prod` へデプロイする仕組みは整備済み）

## Storybook の位置づけ

- `.storybook/`・`*.stories.tsx` あり（`npm run storybook`、port 6006）。ローカルの UI 確認・仮説モック評価の補助ツールであり、大会必須要件の充足証拠ではない

## 大会必須項目に対する観測（判定ではなく事実の対応付け）

| 必須項目（転記） | 観測された状態 | 状態 |
| --- | --- | --- |
| カテゴリに入るプロダクト | 「観光」想定（`/walk` の観光地での寄り道シナリオ）。カテゴリの正式確定は未了 | PM 確認待ち |
| 指定実行基盤での実行 | Firebase App Hosting（stg）にデプロイ・HTTP 200・Vertex AI 呼び出し成功を確認 | stg で観測済み |
| メイン技術は Google 技術 | Gemini（Vertex AI）、Maps JavaScript API・Routes API、Firebase App Hosting が中核 | 観測済み |
| 秘密情報をコミットしない | env 変数・Secret Manager 参照・gitleaks CI 設定あり | 設定を確認 |
| 提出物一式 | `docs/DEMO.md`（デモ台本）・`docs/AI_USAGE.md`（AI 利用の材料）を F10 で下書き。説明ドキュメント・動画・著作物利用シートの確定版は未整備 | 一部下書き |

## 残っている制限・後回し（コードから観測）

- Places API による実在スポット候補（#20、有料・要相談）は未実装。Gemini が選ぶ地点名は実在チェックを通さず、地図のジオコーディングで見つからない場合は仮の位置になる（`src/components/RouteMap.tsx` の `sampleCheckpoints`）
- ログイン・Firestore への保存・ともだちの投稿の実データ化は未実装（投稿は見本。ポイント・アルバムはリロードで消える）
- 思い出カードの文章は気分ごとの見本。AI は写真・メモからカード文を書かない
- `/walk` の出発地は端末の位置情報または東京駅。任意の出発地の指定はできない
- `/terrain` の対象地区は上野〜谷中のみ。他地区の追加・グリッド再生成は後回し（元データはコミットせず取得からやり直す必要がある。PLATEAU 台東区の zip だけで 893,791,397 bytes、[配布 URL](https://assets.cms.plateau.reearth.io/assets/27/f90235-aa3e-4b2e-937e-6c41499135d6/13106_taito-ku_city_2024_citygml_1_op.zip) の HEAD 応答 `content-length` を 2026-11-10 に確認した記録が `scripts/terrain/README.md`）
- 回数制限はメモリ内のため、インスタンスごと・再起動で数え直しになる（厳密な上限ではない）
