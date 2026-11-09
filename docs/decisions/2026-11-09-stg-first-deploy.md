# stg初回デプロイの実機検証

- 日付: 2026-11-09
- 目的: PR #16で導入したCI/CDをstgだけで実行し、OIDC・条件付きIAM・ビルド・rollout・HTTP・専用PRコメントを確認する。
- 確認元: 「次はstgの初回デプロイ検証。接続・権限・公開URL・PRコメント通知を確認し、prodは停止を維持する」という説明に対するユーザー回答「実際に対応して」。この回答を実行承認として再利用する。
- 質問手段・深さ: 既存の説明とチャット回答を再利用（短い確認）。新しい技術選定なし。
- 範囲: DEPLOY_STG_PAUSEDのみ解除し、main由来のコードを検証用PRからデプロイする。文書差分だけのPRでも既存workflowの対象条件を満たす。prodは停止を維持する。
- 制約: 秘密値を表示・記録しない。DBの実データを変更しない。IAMエラー時に無条件権限へ変更しない。
- 事前確認: #16マージ後のCI成功。両backendの環境別SA指定・個別Secret IAMは読み取り確認済み。Policy TroubleshooterはUNKNOWN_CONDITIONALのため、実API評価を成功扱いにしていない。
- 実機結果: run [42590117353](https://github.com/shun-os/df-2026-t184/actions/runs/42590117353) はDeployステップで失敗。CI成功・OIDC認証・ソースGCSアップロードは成功、`firebaseapphosting.builds.create` が403（resource.type/name条件がApp Hostingでは評価不能）。併せてデプロイ失敗がPR Checksに見えない欠陥を確認。修正は [2026-11-09-stg-deploy-fix.md](2026-11-09-stg-deploy-fix.md)（本PRをfix PRへリスコープする案を記録）。
- 関連PR: https://github.com/shun-os/df-2026-t184/pull/16
- 会話リンク: 未取得
