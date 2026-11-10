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

- 観測事実: `apphosting.yaml`（cpu 1 / memoryMiB 512 / minInstances 0 / maxInstances 2、Gemini は 2026-11-10 から Vertex AI を ADC で呼ぶため API キーの参照なし）。Firebase 関連の設定一式（`firebase.json`・`firestore.rules`・エミュレータ設定）あり
- 正式決定: **PM 確認待ち**。設定ファイルの存在は必須実行基盤（`docs/HACKATHON.md`）の候補を満たすが、**実際のデプロイ・公開 URL の実動は未確認**（`docs/STATUS.md`）
- 候補（大会必須の実行基盤から）:

| 案 | メリット | デメリット |
| --- | --- | --- |
| Firebase App Hosting（観測上の現行） | Next.js をそのままデプロイ、Secret Manager と統合 | 実デプロイ未確認。無料枠・クレジットでの継続稼働の確認が必要 |
| Cloud Run | 大会指定の実行基盤の候補（特性は未調査） | 未検証 |
| Firebase Hosting（静的） | 費用は要調査 | SSR/API ルートをそのままでは動かせない |

## D-003: Gemini の呼び出し方式（Vertex AI に決定）

- 旧観測事実（2026-11-10 まで）: `src/app/api/gemini/route.ts` と `src/app/api/quests/route.ts` は `https://generativelanguage.googleapis.com/v1beta/...:generateContent` を `x-goog-api-key`（`GEMINI_API_KEY`）で呼んでいた（Gemini Developer API・API キー方式）
- 正式決定（2026-11-10、本人の判断）: **B. Vertex AI** に切り替える。本人の発言「含まれていたはずなので、vertexの前提で一気に対応しましょうか」（配布された Google Cloud クレジットの対象に Vertex AI が含まれている、という本人の認識による。クレジットの対象サービスは AI が直接は確認していない）
- 切り替えの経緯: API キー方式は請求が AI Studio の前払いクレジットで、残高 0 のため 402 Payment Required で全キーが止まっていた。Google Cloud のクレジット（クーポン）は AI Studio の Gemini API には適用されないと案内されている（https://ai.google.dev/gemini-api/docs/billing 、2026-11-10 参照）
- 実装: `src/lib/vertex.ts`（呼び出し）と `src/lib/vertex-server.ts`（ADC のトークンと環境変数から作る）。プロジェクトは `VERTEX_PROJECT_ID` → `GOOGLE_CLOUD_PROJECT` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID` の順、場所は `VERTEX_LOCATION`（既定 `global`）、モデルは `GEMINI_MODEL`（既定 `gemini-3.5-flash-lite`。`gemini-2.5-flash` は Vertex AI で 2026-10 に提供終了し、404 になることを確認した。後継の候補は `gemini-3.8-flash` と `gemini-3.5-flash-lite` で、クレジット節約のため安い flash-lite にした。https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions 、2026-11-10 参照）
- 権限: stg・prod のランタイム SA に `roles/aiplatform.user` を付与（プロジェクト単位）
- 捨てた案: A（API キー方式）はクレジットが使えず、前払いの実費が必要なため
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


## D-005: PR連動の共有stg・main連動のprodデプロイ

- 日付: 2026-11-09
- 背景: 同一GCPプロジェクト内のstg/prodに、CI成功後の自動反映を接続する。
- ユーザー指示: PR→stg、main→prod。レビュー対応と専用PRコメント化は本セッションで承認済み。
- 技術の比較・実装根拠はAIによる整理。OIDC/CLIの個別選定理由について本人の発言は未記録。PMの正式な技術選定の追認は未確認。

- テーマ: GitHub Actions から App Hosting への認証とデプロイ方式
- 候補:

| 案 | メリット | デメリット |
| --- | --- | --- |
| A. OIDC/WIF（採用） | SA鍵の配布・ローテーション不要。providerのattribute-conditionでrepo/owner ID・event・ref・workflow_refを固定できる | 設定が複雑。workflow_runに限定されるためworkflow改修が絡むと条件見直しが必要 |
| B. SA鍵をGitHub Secretsに保管 | 実装が単純 | 長期鍵の漏洩リスク・ローテーション運用が発生。鍵をリポジトリ外へ出す |

| 案 | メリット | デメリット |
| --- | --- | --- |
| A. Actions CLI デプロイ（採用） | 既存CIの成功をworkflow_runで受けて同じパイプラインで処理できる。共有stgへのPR連動・選定ロジックをコードで制御できる | 権限・選定・待機の実装を自分で持つ |
| B. Developer Connect + App Hosting自動ロールアウト | GitHub接続・ブランチ連動デプロイがマネージド | PR連動の共有stgデプロイや「CI成功時のみ」の条件を外側で別途組む必要がある。既存CIとの連携が弱い |

- 決定と理由: OIDC + Actions CLI。鍵を作らない方針と、PR連動の共有stgという
  要件に既存CIを直接組み合わせられる点が理由。ユーザー本人の選定理由の
  発言は未記録（実装上の選択はAIによる設計）。
- 捨てた案を選ばなかった理由: SA鍵はローテーション運用と漏洩面が残る。
  Developer Connect は共有stgへのPR連動・既存CIゲートの条件を外で組む
  必要があり、今回の要件に合わない。


- 初回有効化: 両環境をpausedにして導入し、権限検証とstg実機成功後にprodを解除する。ビルドSA権限・条件付きIAM・BUILDシークレットの検証を省略しない。
- 詳細: [判断記録](decisions/2026-11-09-ci-cd-apphosting.md)、[環境手順](environments.md)。

## D-006: 坂・日陰デモの経路取得とデータの持ち方

- 日付・決めた人：2026-11-09、PM（山田）。[発表準備の判断記録](decisions/2026-11-09-pitch-and-terrain-demo.md)。
- 決定：固定した東京の1地区で「最短 vs 寄り道」の2経路を比べる。経路は表示のたびに Routes API で取得して保存しない。標高（国土地理院）と日陰（PLATEAU＋太陽位置、時刻固定）は地区全体を事前計算して配信し、表示時に経路を重ねて集計する。アプリ内の専用ページに表示し、PR #14 の上に積む。
- 候補A（採用）：Routes API＋自前の事前計算グリッド。PR #14 と同じ経路を使え、経路を保存しないので規約に沿う。一方、表示ごとに API を2回呼び、無料枠（月1万回）を超えると課金される。
- 候補B：OpenStreetMap から経路を作って固定。追加費用がなく、経路ごとの事前計算もできる。一方、アプリの地図（Google Maps）と経路の出どころが分かれ、ODbL の出典表記が必要。
- 候補C：Routes API の結果を30日以内の一時保存として事前計算。計算は単純になるが、規約の解釈に頼るリスクがある。
- 理由：本人が Routes API を選択（AI推奨はB）。規約への対応はAが条件（AIが規約を確認）。費用は無料枠内での利用を本人が承認。
- 実装（#19）：台東区 上野公園〜谷中〜鶯谷。標高は国土地理院 `dem5a_png`（5mメッシュ、2026-11-09 取得）、建物は PLATEAU 台東区 2024年度（CC BY 4.0）。詳細は #19 の `docs/decisions/2026-11-09-terrain-compare-implementation.md`。
- 未確認：Routes API の実経路での計算結果、欠損率。現地精度と通行可否は検証しない。

## D-007: 共通の寄り道体験と推定地理データの構成方針

- 日付・決めた人：2026-11-09、PM（山田）。[本人回答・最終確認](decisions/2026-11-09-inclusive-map-architecture.md)。
- 決定：Firebase＋地理データの事前計算・配信を第一候補にする。東京の限定経路で現地未検証の推定値を表示し、発表後は少人数で楽しさと選びやすさを評価する。個別サービス採用・有料資源作成の一括承認ではない。
- 候補A（第一候補）：既存Firebase基盤＋限定経路の事前計算。既存設定を利用し、表示時の計算を減らせる。一方、前計算の更新・対象日時・推定の限界を管理する必要がある。
- 候補B（後段で再評価）：Cloud Run経路API＋SQL/PostGISによる独自広域探索。経路検索や空間データ管理を拡張できる一方、データ整備・DB運用・費用が増える。
- 理由：共通の楽しさを維持し、言語・移動条件に応じた支援を加える。現地検証できない制約の下で、公開データによるサービス化の見通しを示す。構成の工数・費用優位は未計測。
- Bを今選ばない理由：限定経路比較では必要性が確定していないため（AIの設計理由。本人は「追加支出は個別承認」「限定経路で実データを試す」を選択済み）。永久に不採用とはしない。
- [合意した方針・理由・残論点](ARCHITECTURE-POLICY.md)。D-001〜D-004の全項目を追認する決定ではない。

## D-F02: 入口 `/` から `/walk` への移し方

- 日付・決めた人：2026-11-10、superloop の worker（AI判断・PM確認待ち）。[判断記録](decisions/2026-11-10-F02-root-to-walk.md)。
- 決定：`src/app/page.tsx` で `next/navigation` の `redirect("/walk")` を呼ぶ（Server Component なので 307 Temporary Redirect）。旧 `YorimichiApp` は `src/components/` に残し、どこからも import しない。
- 候補A（採用）：`page.tsx` で `redirect()`。変更が1ファイルに収まり、URL が `/walk` にそろう。単体テストで確かめやすい。一方、`/` に来るたびにリダイレクトが1回挟まる（静的生成されるので `x-nextjs-cache: HIT`、`evidence/F02/curl-root.txt`）。
- 候補B：`next.config.ts` の `redirects()`。描画前にリダイレクトできる。一方、設定ファイルは全員に影響する変更で、Vitest の単体テストで確かめにくい。
- 候補C：`/` でも `WalkPage` をそのまま描く。リダイレクトがない。一方、同じ画面に URL が2つでき、`/walk` 内のリンク・状態の扱いが二重になる。
- 恒久の 308（`permanentRedirect`）にしない理由：ブラウザにキャッシュされ、入口を戻すときに残るため。
## D-008: /api/quests の失敗の原因の伝え方（F03）

- 日付・決めた人：2026-11-10、AI（superloop の F03 worker）。PM 確認待ち。[判断記録](decisions/2026-11-10-f03-quest-failure.md)。
- 決定：失敗を `QuestFailure`（timeout / invalid_output / upstream / config / network）に分け、サーバーは `{ error, reason }` と原因別のステータス（時間切れ 504、上流・不正な出力 502、設定・認証 500）で返し、原因・モデル名・所要時間・Gemini の理由（先頭300字）を1行の JSON でサーバーログに出す。`/walk` は原因を見本の知らせの文言に出す。新しい依存は足さない。
- 候補A（採用）：応答本文に `reason` を入れる。クライアントがステータスの意味を推測せずに済み、画面とログで同じ語を使える。一方、応答の形が1項目増える。
- 候補B：HTTP ステータスだけで区別する（504=時間切れ、502=その他）。応答の形は変わらないが、不正な出力と上流エラーを区別できず、画面で原因を伝えられない。
- 候補C：構造化ログのライブラリ（pino など）を入れる。ログの扱いは揃うが、依存が増え、1つのルートのためには過剰。
- 時間切れの上限はサーバー 20 秒・ブラウザ 25 秒のまま（サーバーが先に切れて原因を返せる順序）。#10 の「60秒に延ばす」は、待ち時間が長すぎて流れが止まって見えるので採らない（PM 確認待ち）。

## D-F06: ポイントと称号の持ち方（F06）

- 日付・決めた人：2026-11-10、superloop の F06 worker（AI判断・PM確認待ち）。[判断記録](decisions/2026-11-10-f06-points-titles.md)。
- 決定：ポイントは保存せず、`WalkApp` が持つアルバム（メモリ内）から毎回計算する純粋関数（`src/features/walk/points.ts`）にする。見本の記録は数えない。新しい依存は足さない。
- 候補A（採用）：アルバムから計算する。状態が1つで食い違いが起きず、単体テストしやすい。リロードで消えるが、SPEC が保存しないことを求めている。
- 候補B：ポイントを別の state として加算していく。地点ごとの演出は付けやすいが、アルバムと二重管理になり、やり直し時に食い違う。
- 候補C：localStorage に保存する。リロードしても残るが、SPEC の「保存はしない」に反し、見本と自分の記録の区別も保存先で扱う必要が出る。
## D-F04: /api/quests・/api/gemini の回数制限の方式（F04）

- 日付・決めた人：2026-11-10、AI（superloop の F04 worker）。PM 確認待ち。[判断記録](decisions/2026-11-10-f04-rate-limit.md)。
- 決定：`src/lib/rate-limit.ts` に依存なしのメモリ内・固定窓の回数制限を作り、接続元 IP ごとに1分10回まで。接続元は stg・prod では App Hosting が付ける `x-fah-client-ip`（利用者が送った同名ヘッダーは前段で実接続元 IP に上書きされることを stg で実測）、local ではヘッダーを信用せず全員共通のキー（差し戻しで先頭→XFF右から2番目→x-fah-client-ip と2回変更）。超えたら Gemini を呼ばずに 429・`Retry-After`・`{ error, reason: "rate_limited" }` を返す。`/walk` は `QuestFailure.RateLimited` として見本に切り替え、原因を知らせに出す。
- 候補A（採用）：メモリ内の固定窓（`Map`）。依存も費用も増えず、テストで時計を差し替えやすい。一方、インスタンスごと・再起動で数え直しになり、厳密な上限ではない。
- 候補B：Firestore や Memorystore（Redis）で数える。インスタンスをまたいで正確に数えられる。一方、費用・ルール変更・依存が増え、SPEC の「メモリ内」と違う。
- 候補C：`@upstash/ratelimit` などのライブラリ。滑らかな窓など機能は多いが、外部の保存先が前提で、Bと同じ費用・依存の問題がある。
- 接続元の候補：(1) X-Forwarded-For の先頭を使う（最初の実装）→ 利用者が書けるので避けられる、捨てた。(2) XFF の右から決まった位置を使う → stg で実測したら末尾に付くプロキシは資料の1つではなく2つで、右から2番目は接続元でなく共有インフラの IP（全員が1キーになる）だったため捨てた。(3) `x-fah-client-ip` を使う（採用）→ stg で偽の値を送っても実接続元 IP で上書きされることを確認。公式の仕様記述は見つからないが、外部調査でも接続元 IP を返すと報告されている（https://github.com/arcjet/arcjet-js/issues/5383 ）。
- stg での実測証拠: `evidence/F04/stg-headers.txt`（届いたヘッダーの実値）、`evidence/F04/stg-curl.txt`（別の接続元 IP からは制限されないこと）。
- 未決定・既知の限界：`x-fah-client-ip` が将来 App Hosting で変わると全員が共通キー `unknown` に倒れる（厳しくなる側）。上限 10 回/分は Gemini の呼び出し回数を抑える歯止めとして AI が決めた値で、計測に基づくものではない。
## D-008: `scripts/terrain` のテストを `npm test` に含める

- 日付・決めた人：2026-11-10、AI（superloop F08 worker）。AI判断・PM確認待ち。[判断記録](decisions/2026-11-10-f08-terrain-merge.md)。
- 決定：`vitest.config.mts` の `include` に `scripts/**/*.test.ts` を足し、`/terrain` のグリッド生成スクリプトのテスト（gsi・plateau・png）も `npm test` で回す。
- 候補A（採用）：Vitest の `include` を広げる。追加の依存も設定ファイルも要らず、CI と失格条件の `npm test` に自動で入る。一方、jsdom 環境で Node 向けのスクリプトのテストを動かす（現状 3 ファイル・全件通過）。
- 候補B：`package.json` に `test:scripts` を別に作り、node 環境で回す。環境は正確になるが、`npm test` だけを見る評価役や CI では回らず、壊れても気づかない。
- 候補C：変えない（`feat/terrain-compare` のまま）。差分は最小だが、スクリプトのテストがどこからも実行されない。
- B・C を捨てた理由：F08 の完了条件「terrain 系テストが通る」を、普段のチェックで継続的に確かめられないため。
## D-009: 出発地・行き先の入力候補の出し方

- 日付・決めた人：2026-11-10、PM（山田）が候補 A を選択。理由は未回答。[判断記録](decisions/2026-11-10-route-map-pins.md)。要相談 PR（有料 API の追加）。
- 決定：`/walk` の入力画面で、出発地・行き先の入力候補を Places API (New) の Autocomplete（Maps JavaScript API の `AutocompleteSuggestion`）で出す。候補を選んだら `Place.fetchFields({ fields: ["location"] })` で座標だけを取り、地図はその座標を使う（地名検索も現在地も使わない）。出発地は Gemini にも渡す。地図キーがない・読み込めないときは今までどおりの文字入力。
- 候補A（採用）：Places API (New) Autocomplete。施設名に強く、打つたびに候補が出る。寄り道地点の実在チェック（#20）にも流用できる。一方、有料で、キーの API 制限に Places API (New) を足す設定が必要。
- 候補B：いま使っている Geocoding の結果を複数並べる。新しい API は増えないが、住所向けで施設名に弱く、候補が 1 件しか出ないことが多い。
- 候補C：手で用意した主要駅・公園の一覧から選ぶ。費用ゼロでデモは確実だが、一覧にない場所に行けない。
- 費用の抑え方：入力中の候補取得と、選んだときの座標取得を同じセッショントークンでまとめる（`src/lib/places.ts`）。座標取得は `location` だけを頼み、Place Details Essentials の範囲に収める。打ち終わって 250ms 待ってから、2 文字以上で候補を取る。
- 料金（2026-11-10 参照。検索結果の要約から転記し、本文とは未照合）：セッションが Place Details Essentials で終わると、セッション内の Autocomplete は最初の 12 回が Autocomplete Requests SKU、13 回目以降は無料（[Autocomplete (New) and session pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing)）。Autocomplete Requests と Place Details Essentials は、それぞれ月 10,000 回まで無料（[core services pricing list](https://developers.google.com/maps/billing-and-pricing/pricing)）。無料枠を超えたあとの単価：（未記入: 要調査）。
- 人が行う設定：Cloud Console で「Places API (New)」を有効にし、ブラウザ用キー（`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`）の API 制限に追加する。未設定のときは候補が出ず、文字入力として動く（地点名の地名検索は今までどおり）。
- 出発地の送り方（AI判断・PM確認待ち）：地名を選んだときはその名前だけを送る。「現在地」は「寄り道ルートを作る」を押したときに位置を取り、座標を小数第 2 位（約 1km）に丸めた文（例：`現在地（北緯35.67・東経139.65付近）`）にして送る。正確な座標は Gemini に送らない。
