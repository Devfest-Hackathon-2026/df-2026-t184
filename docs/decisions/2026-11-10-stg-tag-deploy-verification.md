# PR21マージ後のstg実機検証

- 日付: 2026-11-10
- セッション参照: 同一会話。メッセージURLは未取得。
- 質問・確認: PR21マージ後、検証PRでstgの実デプロイとURL表示を確認する。
- 本人の回答: 「そしたらいったん検証も兼ねて上記対応して」
- 選定理由: 「検証も兼ねて」。追加理由は未回答。
- 手段・深さ: チャットの明示依頼を再利用した短い確認。新しい技術選定なし。
- 再利用する判断: 2026-11-09-stg-first-deploy、2026-11-09-stg-deploy-fix。

## 範囲

stgのpauseを解除し、この文書のみのPRから既存CI/CDを実行する。OIDC、タグ条件IAM、build、rollout、HTTP応答、Deploy / stgの状態、専用PRコメントを確認する。prodはpauseを維持する。権限の無条件付与は行わない。

## 観測と残作業

PR21はmainの7f3ff4eにマージ済み。マージ後CIは成功（https://github.com/shun-os/df-2026-t184/actions/runs/42654105638）。このPRではアプリコードとworkflowを変更しない。実デプロイ結果とタグ条件の境界は未検証で、成功扱いにしない。結果はActionsと専用PRコメントで確認する。

## 初回実行と修正（2026-11-10）

- CD run 42654872944はbuild作成まで成功。Cloud Build 7c07b446-09f0-4d35-a750-68bb88e3cf77のpreparerでSTG_GEMINI_API_KEYのsecretmanager.versions.get不足により失敗。
- builds.describeでビルド主体はyorimichi-stg@と確認。既存secretAccessorのみではメタデータ取得権限が不足する。
- firebase-tools 15.35.0のsrc/apphosting/secrets/index.tsはbuild SAにsecretAccessorとviewerを付与する標準実装。これに合わせSTG_GEMINI_API_KEY / STG_GOOGLE_MAPS_API_KEY / STG_FIREBASE_API_KEYの個別IAMに同SAのroles/secretmanager.viewerを追加し、readback済み。prod変更・秘密値参照なし。
- ユーザーの実機検証と不具合対応依頼の範囲で実施。同CD runを再実行。結果待ち。タグ条件によるstg build作成は確認できたが、prod拒否は未検証。

## 再実行結果とコメント権限修正

stg deploy・rollout・smoke成功、公開URLへのHTTP 200を確認。PRのDeploy / stgはsuccess。一方reportだけPOST /issues/22/commentsで403。report jobだけpull-requestsをreadからwriteへ修正し、issues:writeは維持する。OIDC権限は付与しない。同じ症状の報告: https://github.com/github/rest-api-description/issues/6994 。修正はmain取り込み後に実機確認が必要。
