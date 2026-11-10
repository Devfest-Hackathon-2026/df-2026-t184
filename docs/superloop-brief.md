# 夜間ループのブリーフ（寄り道MAP / 2026-11-10）

superloop（hootl-superagent）に渡す入力の下書き。kickoff の Planner はこれを元に `docs/SPEC.md`・`test-results.json` を書く。
作成: 2026-11-10 05:30 JST。基準: `origin/main` = `3d64fc0`。

## 0. 前提（PM 回答済み 2026-11-10 05:3x）

| 項目 | 決定 |
|---|---|
| コードフリーズ | 11/10 19:00（`docs/HACKATHON.md` の転記。公式未照合） |
| ループ停止 | `STOP_AFTER=2026-11-10T12:00:00+09:00`。午後は人がレビュー・merge・prod 確認・提出物 |
| 範囲 | `/walk` の一連の流れの完成 ＋ 坂・日陰の `/terrain`（PR #19 を取り込む） |
| 権限 | 制限なし。予算を超えそうな場合だけ止める |
| 既存 PR | #7（レート制限）・#9（ポイント・称号）・#10（Gemini 時間切れ）を取り込む。#19 も取り込む。#20（Places API）・#11・#18・#28・#29 は触らない |
| CLI | worker = claude / 評価役 = codex（read-only サンドボックス） |

注意: #7（`feat/rate-limit`）・#9（`feat/points`）・#10（`fix/gemini-timeout`）は旧画面 `src/components/YorimichiApp.tsx`（`/`）か古い main を対象にしている。プロダクト本体は `/walk`（`src/features/walk/`）なので、**この3本は中身を参照して `/walk` 側に作り直す**。ブランチをそのまま merge しない。
#19（`feat/terrain-compare`）は MERGEABLE でテストも通っている記録があるので、**そのまま merge して取り込む**。

AI の仮定（PM 未確認・朝に確認する）:
- #10 に含まれる「既定モデルを軽いものに変える」は取り込まない。モデルは Vertex 切り替え（#30）で決めた設定のままにする
- `/` を `/walk` の入口にする（F02）。旧 `YorimichiApp` は削除せず、ルートから外すだけ

## 1. docs/RULES.md に入れる内容

### 目的と制約
- DevFest GDGoC Japan Hackathon 2026 の提出物「寄り道MAP」。11/10 19:00 のコードフリーズまでに、`/walk` の流れと `/terrain` が一続きのデモとして動く状態にする
- 使ってよい: 既存の Next.js 16.4.5 / React 19.3 / Tailwind 4 / Vitest / Storybook、Vertex AI の Gemini（`src/lib/vertex*.ts`）、Maps JavaScript API・Routes API（既存の使い方の範囲）、`public/` に置く事前計算データ
- Next.js 16 は学習データと違う。コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読む（リポジトリの `AGENTS.md`）
- 判断に迷う点は人に聞けない。自分で決めて進め、決めた内容と理由を `docs/decisions/` に「AI判断・PM確認待ち」として記録する

### 権限（PM 指示 2026-11-10: 制限なし）
- デプロイ、`gcloud` / `firebase` の操作、API の有効化、Secret Manager、環境変数、Firestore、CI 設定、依存の追加、`main` への push・PR 作成・merge を含め、目的の達成に必要なことは何をしてもよい
- 唯一の停止条件は予算: 有料の操作（API の有効化・新しい有料サービス・利用量が増える設定など）の前に、費用の見込みと残予算を確かめる。予算を超えそうなら、その操作をせずに `superloop stop` で止め、理由を `docs/decisions/` に残す
  - 予算の基準: GCP のクレジット残高 3,165円（2027-05-10 期限、`docs/architecture/README.md` の調査時点）と、プロジェクトの予算アラート。エージェントの利用料は `logs/costs.txt`
### 失格条件（評価役が1つでも当てはまれば NEEDS_WORK）
- 秘密情報をコミットしている
- `npm run lint`・`npm test`・`npx tsc --noEmit`（`next typegen` 後）・`npm run build` のどれかが失敗する
- 見本データ・固定値・推定値を、本物の結果のように見せている（画面に区別の表示がない）
- `/terrain` で欠損・範囲外を数値として扱う、または坂・日陰から段差・幅員などの通行可否を保証する表現がある
- 数値・統計・引用に出典がない（根拠がなければ「（未記入: 要調査）」）
- 既存のテストを消して通している

### 評価基準（SCORE 行で 0〜3）
1. 対象ユーザーが一連の操作で目的を達成できるか（審査基準 2a・2b）
2. 失敗時（AI 失敗・地図キーなし・時間切れ・回数制限）でも流れが止まらないか
3. 安全性・保守性（レート制限、入力検証、テスト）（審査基準 2c）

## 2. 機能表（Planner はこれを SPEC.md に展開する）

完了条件は、評価役がローカルのコマンドと証拠ファイル（デプロイした場合は公開 URL も）で確かめられる形にする。証拠は `evidence/Fxx/` に置く。

| ID | 機能 | 完了条件 | depends_on |
|---|---|---|---|
| F01 | 基盤と手順書 | `docs/RUNBOOK.md` に worktree での準備（`npm ci`、キーなしの `.env.local` の作り方）・起動・テスト手順。lint / test / tsc / build が通る記録を `evidence/F01/` に置く。機能の追加はしない（夜間全体の単一障害点なので小さく保つ） | ― |
| F02 | 入口を `/walk` にする | `/` を開くと `/walk` の体験に入る（旧 `YorimichiApp` はルートから外すだけで削除しない）。テストで確認 | F01 |
| F03 | Gemini の時間切れ・失敗の改善（#10 相当） | `/api/quests` の時間切れ・不正応答・上流エラーで、`/walk` が見本に切り替えて画面で知らせる。ログに原因が残る。単体テストあり | F01 |
| F04 | 回数制限（#7 相当） | `/api/quests`・`/api/gemini` に IP ごとの回数制限（メモリ内）。超過で 429、`/walk` は見本に切り替えて知らせる。テストあり | F03 |
| F05 | `/walk` の一連の流れの通しテスト | 入力 → 探索 → ルート → 記録（写真枠・メモ）→ 思い出カード → フィードを、AI 成功・AI 失敗・地図キーなしの3通りで通す統合テスト。見本と本物の区別表示を確認 | F02 |
| F06 | ポイント・称号（#9 相当） | `/walk` で地点の達成・記録に応じてポイントと称号が付き、スタンプ画面に出る。保存はしない（リロードで消える旨を表示）。テストあり | F05 |
| F07 | アクセシビリティ | `/walk` の全画面をキーボードだけで操作できる。画面遷移でフォーカスが見出しへ移る。操作要素に role と名前（`aria` ラベル）がある。jsdom + testing-library のテストで確かめる（ブラウザ実機の幅・ダークモードの見た目は朝に人が確認） | F06 |
| F08 | `/terrain` の取り込み（#19） | `feat/terrain-compare` を merge し、現在の main 上で `/terrain` の静的生成が成功、terrain 系テストが通る。データの出典・ライセンスが `scripts/terrain/README.md` と `docs/ASSETS.md` にある | F01 |
| F09 | `/walk` と `/terrain` をつなぐ | `/walk` のルート画面（またはタブ）から坂・日陰の比較へ移れる。対象が上野〜谷中の固定デモ経路であること、推定値で現地未検証であること、不明区間を画面に出す | F05, F08 |
| F10 | デモ台本と状況の記録 | `docs/DEMO.md`（5分デモの手順、ローカルと stg での確認手順）、`docs/STATUS.md` を現在のコードに合わせて更新、提出用「AI をどの場面でどう使ったか」の材料を `docs/` に下書き（事実のみ） | F04, F07, F09 |

並列の段（想定）: F01 → {F02, F03, F08} → {F04, F05} → {F06, F09} → F07 → F10

## 3. 後回し（ループでは作らない）
- Places API による実在スポットの候補（#20、有料・要相談）
- ログイン・Firestore への保存・友達の投稿の実データ化
- 災害時の案内、多言語対応
- `/terrain` の対象地区の追加、事前計算データの再生成（元データ約1.4GB）
- CI・デプロイ設定の変更、カテゴリ・提出文の確定

## 4. `.superloop/config.sh`

```sh
WORKER_AGENT=claude
EVALUATOR_AGENT=codex
PARALLEL=3                 # next build と npm ci を worktree ごとに回すので控えめに
WORKER_TIMEOUT_MIN=60
MAX_ITER=30
STOP_AFTER=2026-11-10T12:00:00+09:00
PUSH=1                     # loop ブランチだけ。push で CI は走るがデプロイはしない（deploy-stg は PR、deploy-prod は main の push が条件）
LOOP_BRANCH=loop
CODEX_EVAL_SANDBOX=workspace-write   # 下の注を参照
```

注: ハーネスの既定は codex 評価役を `read-only` で動かす（`lib/agent.sh:19`）。この状態では `npm run build`（`.next/` を書く）や `next typegen` が失敗し、評価役が完了条件を確かめられず全機能が NEEDS_WORK になり得る。`workspace-write` にすると評価役の worktree 内に書けるようになるが、Router が merge するのは worker のコミットだけなので、評価役の書き込みは `loop` に入らない。弱まるのは「評価役が worktree を汚さない」保証のみ。設定ファイルで効かなければ、起動時に環境変数で渡す。

ハーネスの動き（`bin/superloop` で確認）: `loop` は起動時のブランチから作られ、worker の worktree は `HEAD` から切られる。だから起動する作業ツリーは `origin/main` から作ったきれいなものにする。

## 5. 起動前の手順（寝る前。試運転を含めて40〜60分見込み）

1. 汚れた今の作業ツリー（`setup/stg-prod-environments`）は触らず、新しい worktree を `origin/main` から作る
   `git worktree add ../df-2026-t184-loop -b loop-base origin/main`
2. そこに `install.sh` を実行。既存の `AGENTS.md` は上書きされないので、テンプレートの4行を手で追記する
3. `docs/RULES.md` を上の §1 で埋める。このブリーフを `docs/superloop/` に置く
4. `superloop plan "<このブリーフを読んで仕様にする>"` → `superloop check` → 承認してコミット
5. 試運転（必須）: `MAX_ITER=1 superloop run` で F01 が PASS して `loop` に merge されるまで見届ける。`logs/eval-*-F01.md` で評価役が実際に lint / test / build を実行できたかを確認する。ハーネスのテストは偽 CLI だけなので、本物の claude・codex で通るまで寝ない
6. 本番: `tmux new -s loop` → `caffeinate -dimsu superloop run 2>&1 | tee logs/run.log`。電源につなぐ

## 6. 起きたらやること（12:00〜19:00）

1. `superloop status` で合格・未合格を確認。未合格の機能は止めた理由を見る
2. `loop` → `main` の PR を draft で作る（stg に自動デプロイされる）。`scripts/`・`public/terrain/` の追加と、ハーネスのファイル（`.superloop/`・スキル・`test-results.json`・`PROGRESS.md`・`docs/SPEC.md`・`docs/RULES.md`）は AGENTS.md の「全員に影響する変更」に当たるので、チームのレビューを依頼
3. stg で `/walk`・`/terrain` を実機確認（Maps キーに Routes API が入っているかもここで分かる）。スマホ幅・ダークモードの見た目もここで見る
4. §0 の「AI の仮定」（#10 のモデル変更を除外、`/` → `/walk`）を確認する
5. 遅くとも 18:00 までに main へ merge → prod デプロイ → prod URL で確認
6. 提出物（PR #18 の骨子、動画、著作物利用シート）を仕上げる

## 7. 残るリスク
- worker は制限なしで動く。stg・prod は同じ GCP プロジェクトにあり、夜間に prod へのデプロイや設定変更が起こり得る（PM 承認済み）
- 予算の判断は worker の見積もりに頼る。予算アラートは事後の通知で、支出の上限ではない
- ハーネスは本物の CLI での長時間運転が未検証
- Routes API がキーで有効か、Vertex AI の実呼び出しはローカルで確かめられない。評価は見本・失敗時の経路で行い、実接続は stg で人が確認する
