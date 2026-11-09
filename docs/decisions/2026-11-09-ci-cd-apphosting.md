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

## PR16 レビュー対応（同日・追加依頼）

### 通知先の変更（ユーザー承認済み）

ユーザーの回答（親エージェント経由、原文のまま転記）:
『通知先を「専用のPRコメントに変更する」』

- 実装: `report-stg-deploy.py` は PR 本文 PATCH を廃止し、
  `issues/{pr}/comments` への追記型コメントに変更した。本文・他者コメントは
  一切編集しないため、人の同時編集を失う競合は起きない。
- 同一 run 再実行の重複抑止は、全コメントをページングして
  `github-actions[bot]` 作者＋`<!-- STG_DEPLOY_STATUS -->`＋run URL が
  一致する既存コメントがあれば skip する。bot以外のマーカーは採用しない。
- report ジョブの concurrency は全PR共通から run 単位（`github.run_id`）へ。
  全PR共通だと待機中の報告が pending 置換で消えて記録が残らないため。
- 権限は `issues: write` + `pull-requests: read`（OIDC なし、GCP 権限なし）。

### prod 選定の再設計（レビュー指摘への対応）

`cancel-in-progress: false` でも古いCI再実行が最新mainの pending job を
置き換え得る問題への対応。Infobox（sumasuma-app/infobox）の
`e2e-commit-status.mjs` と同じく「イベントを信じず最新runをAPIで読み直す」
設計をprodへ応用した。

- ロック取得後に現在のmain headと、そのSHAの正規push CI runの**最新attempt**
  を読み直し、成功時のみそのSHAを選ぶ。古い成功SHAへのフォールバックはしない。
- source checkout は選定SHAに一致させ、ロールアウト待機直前にも再解決する。
  選定が変わればskip（新しいmainは自身のworkflow_runが処理する）。
- 回帰テスト: 古いイベントがpendingを置換しても「現在のmain＋CI成功」が
  選ばれること、最新attempt失敗/実行中/キューを成功扱いしないこと、
  ページング越しの選定、非信頼run（別workflow/別repo/別branch/別event）の除外。

### その他のレビュー対応

- ロールアウト一覧は `scripts/apphosting-rollouts.py` に集約し
  `nextPageToken` を全ページ辿る。PAUSEDは名前付きで即失敗（待機中に
  クラウド側で再開される競合を防ぐ安全側動作）。
- verify は「JOB_START以降の作成時刻＋`deployment-tool=cli-firebase`ラベル」で
  相関する。CLI（firebase-tools 15.35.0）は rollout/operation IDを標準出力に
  出さないため完全相関とは呼ばない。
- backend検証に `serviceAccount` 一致検査を追加
  （`yorimichi-<env>@df-2026-t184-prod.iam.gserviceaccount.com`）。
- ブランチ削除を getRef→deleteRef から `git push --force-with-lease` の
  原子的lease削除へ変更。ローカルbareリポジトリでの競合再現テストを
  `scripts/test-branch-delete.sh` としてCIで実行。open PR利用チェックは維持、
  「open PR確認と削除の原子性は保証できない」ことを文書に記録。
- bootstrap: `mktemp` を末尾XXXXXX+trap cleanupに修正。gcloudアカウントは
  既定をMeiアカウントに明示固定したまま `BOOTSTRAP_GCLOUD_ACCOUNT` で
  override可能にした（ambientなcorporateデフォルトには依存しない）。
- stg checkout順を trusted→candidate→source に変更し、不要な
  `fetch-depth: 0` を削除。`scripts/__pycache__` を `.gitignore` へ追加。

### 技術選定の記録（D-XXX 転記用ドラフト）

`docs/DECISIONS.md` はmainにのみ存在し（merge-baseには無い）、このブランチで
同パスを追加するとマージ時に add/add 競合になるため、**ブランチ内では作成しない**。
マージ後にPMがmain側へ次番（現状 D-005 相当）として転記する想定の内容を残す。

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

### 検証

- `python3 scripts/test-deploy.py`: 23テスト全通過（prod再解決・ページング・
  ロールアウト相関・レポート投稿のmock回帰を含む）。
- `bash scripts/test-branch-delete.sh`: ローカルbareリポジトリで
  stale lease が拒否され競合pushが残ることを実証。
- `bash -n` 全スクリプト、`actionlint` 全ワークフロー通過。
- クラウド・GitHub上での実実行（OIDC交換・実デプロイ・実投稿・実push削除）は
  未実施。stg実機検証は有効化手順の段階3で確認する。

### 残課題

- `docs/DECISIONS.md` への D-XXX 転記（main側、PM対応）。
- 初回有効化手順の各段階（権限検証→stg解除→実機確認→prod解除→mainCI rerun）。
- 条件付きIAM（builds.create/rollouts.create）・BUILD時シークレット解決主体は未実測。
- reportコメントの投稿経路はmock検証済み。実際のPOSTは初回stgデプロイ時に確認。
