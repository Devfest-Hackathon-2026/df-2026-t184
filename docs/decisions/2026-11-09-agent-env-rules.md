# 2026-11-09-agent-env-rules: 環境・デプロイのルールを AGENTS.md とスキルに置く

- 日付: 2026-11-09
- セッション参照: 未取得
- 質問手段: AI の提案に対する本人の回答（AskUserQuestion は使っていない）
- 深さ: 短い確認のみ

## Q1: 構成方針を AGENTS.md とスキルのどちらに書くか

本人の問い（引用）:

> デプロイやデータのルールといったこういった構成方針についてはAgents.mdを更新したりとか、またはそれぞれskillsを作成するのはありかもと思ったのですがいかがでしょうか？

AI の提案（要約）:

- AGENTS.md には、毎回守るルールだけを短く書き、`docs/environments.md` にリンクする
- 手順の長いものはスキルに分ける。最初は「API・環境変数・Secret を追加する」手順の 1 つにする
- 理由として、PR #14 の Routes API が prod のキーでは許可され、stg のキーでは許可されていなかった例を挙げた

回答（本人の発言を引用）:

> おk良さそうです
> そしたら更新用のPR作成して

選定理由: 上の引用以上の理由は未回答。AI の提案理由を本人の理由として補完しない
未選択の候補の扱い: 「AGENTS.md だけに書く」「ルールごとにスキルを作る」は採らなかった。本人による却下理由は未回答

## 決定

- `AGENTS.md` に「環境・デプロイのルール」節を追加する
- `.agents/skills/env-and-api-change/SKILL.md` を追加する
- stg と prod の構成（PR #12）に依存するため、PR #12 の上に積む

## 結果・検証（セッション終了時追記）

- 成果物: `AGENTS.md` の節追加、`.agents/skills/env-and-api-change/SKILL.md`、本記録
- 検証: 相対リンクの解決と `git diff --check` を確認。スキル内の `gcloud` コマンドは読み取り系のみ実行して確認し、変更系は `--help` でフラグを確認した
- PR: [#17](https://github.com/shun-os/df-2026-t184/pull/17)（#12 の上に積んだ draft）

## 2026-11-10 マージ前の整合修正

本人の依頼「僕がautherのものを先に選んでmergeして」に基づく。追加理由は未回答。会話URL未取得。最新mainを取り込み、スキルの相対リンクは元の3階層で正しく、4階層への変更を検証で検出して撤回。stg実機検証でsecretmanager.versions.get不足が判明したため、既存secretAccessorに加えビルド主体へのSecret単位viewerを記載。根拠は2026-11-10-stg-tag-deploy-verification.mdとfirebase-tools 15.35.0のgrantaccess実装。今回は文書のみでクラウド操作なし。相対リンク・diff checkを確認し、push後CI成功を待ってマージする。
