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
