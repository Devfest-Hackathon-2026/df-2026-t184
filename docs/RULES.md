# プロジェクトのルール

全エージェント（Planner・worker・評価役）が最初に読む。仕様より優先する。背景と経緯は `docs/superloop-brief.md`。

## 目的と制約
- DevFest GDGoC Japan Hackathon 2026 の提出物「寄り道MAP」。11/10 19:00 のコードフリーズまでに、`/walk` の流れと `/terrain` が一続きのデモとして動く状態にする
- 使ってよい: 既存の Next.js 16.4.5 / React 19.3 / Tailwind 4 / Vitest / Storybook、Vertex AI の Gemini（`src/lib/vertex*.ts`）、Maps JavaScript API・Routes API（既存の使い方の範囲）、`public/` に置く事前計算データ
- Next.js 16 は学習データと違う。コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読む（リポジトリの `AGENTS.md`）
- 判断に迷う点は人に聞けない。自分で決めて進め、決めた内容と理由を `docs/decisions/` に「AI判断・PM確認待ち」として記録する

## 権限（PM 指示 2026-11-10: 制限なし）

**この権限は 2026-11-10 の夜間ループ（`STOP_AFTER` まで）に限る。** それ以外の作業・次のループでは `AGENTS.md` の判断のルールと要相談 PR の条件に従い、権限を広げるときは PM が改めて書き直す。

- デプロイ、`gcloud` / `firebase` の操作、API の有効化、Secret Manager、環境変数、Firestore、CI 設定、依存の追加、`main` への push・PR 作成・merge を含め、目的の達成に必要なことは何をしてもよい
- 唯一の停止条件は予算: 有料の操作（API の有効化・新しい有料サービス・利用量が増える設定など）の前に、費用の見込みと残予算を確かめる。予算を超えそうなら、その操作をせずに `superloop stop` で止め、理由を `docs/decisions/` に残す
  - 予算の基準: GCP のクレジット残高 3,165円（2027-05-10 期限、`docs/architecture/README.md` の調査時点）と、プロジェクトの予算アラート。エージェントの利用料は `logs/costs.txt`
## 失格条件（評価役が1つでも当てはまれば NEEDS_WORK）

判定の対象は、その機能の差分（基準コミットからの変更）と、その機能の完了条件だけ。基準コミットの時点からあった問題は、その機能が触っていなければ NEEDS_WORK の理由にしない。気づいた既存の問題は「既存の問題（担当: Fxx）」として指摘に書く。lint・test・tsc・build の失敗は、原因が既存でも NEEDS_WORK にする。

- 秘密情報をコミットしている
- `npm run lint`・`npm test`・`npx tsc --noEmit`（`next typegen` 後）・`npm run build` のどれかが失敗する
- 見本データ・固定値・推定値を、本物の結果のように見せている（画面に区別の表示がない）
- `/terrain` で欠損・範囲外を数値として扱う、または坂・日陰から段差・幅員などの通行可否を保証する表現がある
- 数値・統計・引用に出典がない（根拠がなければ「（未記入: 要調査）」）
- 既存のテストを消して通している

## 評価基準（SCORE 行で 0〜3）
1. 対象ユーザーが一連の操作で目的を達成できるか（審査基準 2a・2b）
2. 失敗時（AI 失敗・地図キーなし・時間切れ・回数制限）でも流れが止まらないか
3. 安全性・保守性（レート制限、入力検証、テスト）（審査基準 2c）
