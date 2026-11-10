# stg初回デプロイ失敗の修正（Deploy/stg status表示 + IAMタグ条件化）

- 日付: 2026-11-09
- 目的: (a) PR Checksにデプロイ結果（Deploy / stg のpending/success/failure/error）をhead SHAへ出す。(b) builds.create の403失敗を、backend直接bindのタグ条件 `resource.matchTagId` に置き換えて修正する。
- 確認元: 親エージェントの説明「PR上にCD表示、backend限定を維持するタグ条件案検証」に対するユーザー回答「対応して」。この回答を実行承認として再利用する。**本人の追加理由は未回答**。
- 質問手段・深さ: 既存の説明とチャット回答を再利用（短い確認）。新しい技術選定の追加承認なし。タグ条件案は親説明に明示された方式をそのまま採用。
- 会話リンク: 未取得
- 関連PR: https://github.com/shun-os/df-2026-t184/pull/21（本PRをfix PRへリスコープする案を記録。以降「stg初回デプロイ検証」ではなく「失敗修正PR」として扱う）

## 承認済み範囲（親説明より）

- cloud mutationはprojectスコープの `deploy-env` タグ key/value、各backendへの直接tag binding、stg deploySAの既存カスタムロールbindingの条件置換のみ。
- 無条件grantへのfallback、別PJ作成、新broker、権限拡大、owner付与、prod IAM変更・デプロイは禁止。
- `DEPLOY_STG_PAUSED` / `DEPLOY_PROD_PAUSED` は両方 `true` 維持（stgも検証完了前に解除しない）。pause解除・Actions rerun・merge/push/GitHub投稿は親担当。

## 失敗の観測事実

- run [42590117353](https://github.com/shun-os/df-2026-t184/actions/runs/42590117353)（Deploy stg, workflow_run, head=main `6cf6670`）は `Deploy` ステップで failure。report ジョブは skip。
- 原因: `firebaseapphosting.builds.create` が 403。IAM条件が `resource.type`/`resource.name` のBackend属性を参照するが、App Hosting は当該呼び出しにresource属性を供給せず条件が常に不成立（前回調査: Audit logのresourceAttributes空、BackendにsetIamPolicyなし）。
- 副次欠陥: workflow_run由来のrunはmain headにチェックが付くため、デプロイ失敗がPRのChecksに一切現れなかった（成功時専用コメントのみだった）。

## 実施したクラウド変更（2026-11-09、yamadamei0512@gmail.com で実行）

- タグキー: 既存 `tagKeys/281481181339464`（`df-2026-t184-prod/deploy-env`、parent `projects/1031159186960`）を再利用。重複作成なし。
- タグ値: `stg`=`tagValues/281480213023116`、`prod`=`tagValues/281482408117851` を新規作成。
- タグbinding（`--location=asia-east1`、backendへの直接bind、プロジェクトへのbindはなし）:
  - `//firebaseapphosting.googleapis.com/projects/df-2026-t184-prod/locations/asia-east1/backends/yorimichi-stg` → `deploy-env/stg`
  - `//firebaseapphosting.googleapis.com/projects/df-2026-t184-prod/locations/asia-east1/backends/yorimichi-prod` → `deploy-env/prod`
  - 両backendでlist確認済み。prod backendにstgタグは付いていない。
- IAM: `github-deploy-stg@…` に対する `projects/df-2026-t184-prod/roles/apphostingRolloutCreator`（builds.create+rollouts.create）の条件を `resource.matchTagId('tagKeys/281481181339464', 'tagValues/281480213023116')` に置換（title `rollout-yorimichi-stg` 維持、description追加）。get-iam-policy → 該当bindingのみ編集 → set-iam-policy（etag一致）で実施。prod deploy SAのbindingは旧式のまま未変更（prodはpaused維持、bootstrap適用時に同方式へ移行）。
- `bootstrap-github-deploy.sh` はタグ管理（key/value/binding、すべてidempotent）と旧条件除去の移行コードを追加済み。**prodへのbootstrap適用は未実施**。

## 検証結果

- タグbinding: 実機list確認済み（上記）。
- IAM条件: get-iam-policyで置換後の式をreadback確認済み。他binding（viewer/support/consumer/actAs/prod側）は未変更。
- Policy Troubleshooter v3: stg/prod両backend・builds.create/rollouts.createとも `UNKNOWN_INFO`（`effectiveTags` が取得されず条件評価できない）。v1も同様に`UNKNOWN_CONDITIONAL`。**UNKNOWNはALLOW/DENYの証拠にしていない**。`firebaseapphosting.googleapis.com` のresource名はCloud Asset analyze-iam-policyでも未対応（INVALID_ARGUMENT）。ALLOW/DENYの実証は pause解除後の実デプロイ（親担当）に委ねる。
- コード: `python3 scripts/test-deploy.py` 37件 pass（新規12件含む）、`actionlint` clean、`bash -n` clean、IAM移行jqフィルタはfixtureで検証済み。

## 設計メモ（status表示）

- `Deploy / stg` commit statusをhead SHAへ投稿。pendingはdeployジョブと同条件で先行投稿、finalはdeploy完了後に `always()` で結果（success/failure/error）を投稿。target_urlはActions run URL。
- `statuses: write` は2ジョブに分離・限定し、deployのOIDC権限と混ぜない。スクリプトはtrusted(main) checkoutのみで動かし、PRソースでstatusを偽装しない。
- successは `deployed == 'true'`（実デプロイ+verify+smoke成功）のときだけ。skip/paused/staleはerror。cancelledはerror。
- 上書き防止: 投稿前に「このrunを起こしたCI runが当該SHAの最新runかつ最新attemptか」をAPIで再確認（`scripts/report-deploy-status.py`）。古いrerun・並行runが新しい結果を上書きしない。
- pendingは「CIイベントhead == 現在のopen・同一repo・main向けPRのhead」のときだけ投稿。
- workflow_runはmain定義のworkflowしか動かないため、**本PR自身ではstatus機能は動かない**。mainへマージ後、CI完了で発火する次のrunから有効。
- 本PRは `.github/` を変更するため、既存のstgデプロイgate（`.github/`変更PRは対象外）で自動デプロイはskipされる。**merge後に別の検証PR（アプリ変更）が必要**。そのPRで初めて builds.create が tag条件の下で実評価される。

## レビュー対応

CI再実行が失敗・取消・timeoutになった場合も、最新attemptのfinalジョブがDeploy / stgをerrorへ終端する。古いattemptのfinalは引き続き投稿しない。pending→CI再実行失敗→errorの回帰テストをRed/Greenで確認（39件成功）。既存の修正依頼の範囲内。
