---
name: kickoff
description: アイデアから superloop の仕様（docs/SPEC.md と test-results.json）を作り、機械チェックと人間の承認を経て、ループを起動できる状態にする。開発の最初に1回だけ使う。
---

# kickoff: アイデア → 承認済みの仕様 → ループ起動の準備

人間が判断するただ1つの場面を、毎回同じ段取りで通す。ループは人間が自分のターミナルで起動する。このスキルからは起動しない。

## 1. 前提を確かめる（満たしていなければ理由を伝えて止まる）
- リポジトリのルートにいて、作業ツリーがきれい（`git status --short` が空。未追跡の個人ファイルは可）
- `.superloop/config.sh`・`docs/RULES.md`・`AGENTS.md` がある。なければ superloop の `install.sh` を案内する
- `docs/RULES.md` に「（未記入）」が残っていれば、人間に聞いて埋める。ルールがないと評価役が判定できない
- `docs/SPEC.md` が既にあれば、上書きしてよいか人間に聞く
- `superloop` コマンドが PATH にある（`command -v superloop`）

## 2. Planner に仕様を書かせる
```bash
superloop plan "<アイデア>"
```
Planner は `.superloop/config.sh` の `PLANNER_AGENT` で動く（既定は評価役と同じ CLI）。今のエージェントが自分で書いてもよい。その場合も superloop の `prompts/planner.md` に従う。

## 3. 機械チェック
```bash
superloop check
```
エラーが出たら、その出力を添えて Planner に直させる。エラーがなくなるまで繰り返し、3回で直らなければ人間に相談する。警告は人間の判断に回す。

## 4. 人間に承認を求める
全文は貼らずに、要点と場所を見せる。見せるものは、課題と対象者（出典付き）、機能ID・完了条件・依存の表（check の「並列の段」も添える）、デモシナリオ、警告。
「承認する／直す（何を）」を聞く。直す場合は Planner に渡して、3〜4 を繰り返す。

## 5. 承認されたら記録する
`docs/`・`PROGRESS.md`・`test-results.json` を `git add` で1つずつ追加し、メッセージ `docs: 仕様を承認する` でコミットする。push するかは人間に聞く。以後の push はループが作業ブランチ `loop` に行い、main への merge は人間が行う。

## 6. 起動の手順を伝える
```bash
tmux new -s loop
superloop run 2>&1 | tee logs/run.log
```
途中経過は loop-status スキルか `superloop status` で見る。途中で指示するときは `superloop steer "<指示>"`、止めるときは `superloop stop`。終わったら retro スキルを使う。
