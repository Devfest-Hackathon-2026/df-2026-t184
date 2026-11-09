# 2026-11-09 CI/CD（App Hosting stg/prod デプロイ）の判断記録

## 日付・セッション参照

- 日付: 2026-11-09
- セッション参照: 未取得（親エージェントからの実装指示書を出典として作業）
- 質問手段・深さ: 短い確認のみ（サブエージェント作業のため対話質問は実施せず、
  指示書の記載をそのまま回答として扱った。PM の追認はこの PR のレビューで行う）

## 短い確認

### 目的・スコープ

PR オープン/更新で共有 stg、main へのマージで prod へ Firebase App Hosting
デプロイする CI/CD を実装する。ワークフロー定義・IAM/基盤の用意は本変更まで。

### 新しい判断の有無

あり（デプロイ方式・認証方式・権限設計）。すべて指示書に明示された方針を
そのまま実装した。以下は指示書の記載を引用したもの。

## 判断（指示書より引用）

- 「PR opened/updated => shared stg deployment, merged main => prod」
- 「OIDC google-github-actions/auth service account federation, no long-lived keys」
- 「workflows gated on tests/lint/build/secrets success, same-repo PR only
  (no fork credentials), main push production」
- 「trusted workflow approach prevent PR changes stealing prod permissions」
- 「per-env concurrency, stale builds not overwriting newer」
- 「WIF providers with repo numeric IDs, event/ref/environment restrictions,
  separate deployment SAs」

## 実装上の確定（指示書からの落とし込み。PM 追認待ち）

- トリガーは `pull_request` ではなく `workflow_run`（CI 成功時）。
  ワークフロー定義が常に main のもので実行される trusted workflow 構成。
- stg: `cancel-in-progress: true`（latest PR wins）+ デプロイ前に
  in-flight ロールアウト完了待ち。prod: `cancel-in-progress: false` で直列化。
- `.github/` を変更する PR は stg 自動デプロイをスキップ（fail-closed）。
- `firebase.json` の `predeploy`/`postdeploy` をデプロイ前に拒否
  （CLI がローカルシェル実行するため OIDC クレデンシャル流出を防ぐ）。
- デプロイ SA の権限は firebase-tools 15.35.0 の API 呼び出し列挙に基づく
  （詳細は `docs/environments.md`「CI/CD」節の表）。
- `apphosting.builds.create`/`rollouts.create` はバックエンド名条件付き
  バインドで環境を分離。条件が評価されない場合のフォールバックは
  文書に記載。

## 選定理由

- 上記は指示書に明記された要件への実装上の対応。未回答の部分はなし。
- 未選択候補の拒否理由は推測しない（pull_request_target 方式・
  Developer Connect による GitHub 連携デプロイなどは指示書範囲外）。

## セッション終了時の追記

- 結果: `.github/workflows/deploy-stg.yml` / `deploy-prod.yml`、
  `scripts/bootstrap-github-deploy.sh`、`firebase.json`/`.gitignore` の
  クレデンシャル除外、`docs/environments.md` に CI/CD 節を追加。
- 検証: YAML パース、`bash -n`、検証スクリプトを実 firebase.json に適用し
  「deploy scope OK」を確認。cloud/IAM/GitHub の変更は未適用（親レビュー待ち）。
- commit: b2606aa（`feat: stg/prod へのデプロイワークフローと OIDC 基盤スクリプトを追加`）
- PR: 未作成（親エージェントが扱う）
