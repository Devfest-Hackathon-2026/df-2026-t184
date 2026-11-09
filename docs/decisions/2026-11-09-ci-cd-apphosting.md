# 2026-11-09 PRとstg/prodの接続

## 目的と本人の回答

ユーザーの依頼: 「stgへのデプロイはPRが作成されたタイミングで、mergeされるとprodにも反映される形でいきたい」
同一PJ、Auth共通、stg/prodの実行環境とDBを分ける方針も同じ会話で確認済み。
質問は重複せずこの回答を再利用した。採用理由の本人の発言は未回答。
会話のメッセージID: 未取得。

## 実装上の選択（AIによる設計）

GitHub ActionsのCI成功をworkflow_runで受け、mainのデプロイ処理を実行する。
候補はDeveloper Connectのブランチ自動デプロイとActionsからのCLIデプロイ。
前者は設定が少ないが共有stgへのPR連動と既存CIの成功判定を別途用意する必要がある。
後者は処理・権限の管理が増えるが、指定されたイベントと既存CIを一緒に扱えるため選んだ。
認証はSA鍵とOIDCを比較。鍵の配布・ローテーションを不要にするOIDCで実装した。
これらはユーザーの選定理由を推測した記録ではない。

## 結果と未検証

mainの固定設定でソースをデプロイする。PR内のデプロイ設定変更は採用しない。
共有stgは最後のデプロイが表示される。最新SHAを再確認し、古いmainの巻き戻しを防ぐ。
GCP/GitHubの接続と初回公開の状況はPR本文に記録する。
この変更は費用・権限に関わるため、AGENTS.mdの規定どおりレビュー後にマージする。

## 追加依頼（同日）

ユーザーの依頼（親エージェント経由、原文のまま転記）:
「after successful stg deployment automatically return stg DB and URL in PR BODY」

実装: deploy 成功後に `report` ジョブ（`pull-requests: write` のみ、`id-token` なし、
main 由来スクリプトのみ）が PR 本文の `<!-- STG_DEPLOY_STATUS -->` ブロックを
冪等に更新する。マーカー外の本文は変更せず、マーカー破損時は更新しない。
単体テストを `scripts/test-deploy.py` に追加（ブロックの保持/冪等置換/
不正マーカー拒否/非適格時に書き込みなし）。
