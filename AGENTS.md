<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## このリポジトリの作業ルール

### 最初に読む文書

- [docs/HACKATHON.md](docs/HACKATHON.md) — ハッカソンの前提・必須ルール。二次資料の転記で公式原本とは未照合。ルール系の判断はここを優先し、疑義は公式情報に確認する
- [docs/STATUS.md](docs/STATUS.md) — 実装状況の観測メモ（コード調査ベース）。「あると思う」前にこことコードを見る
- [docs/DECISIONS.md](docs/DECISIONS.md) — 技術選定の記録と未確認事項

### 判断のルール

- 技術・インフラの提案・決定・設定は **PM（山田）** が行う。AI エージェントは候補とメリット/デメリット・実装根拠を提供し、**未決定事項を勝手に確定しない**
- AI に開発作業を行うたび、作業前の短い確認と判断記録を [.agents/skills/own-the-why/SKILL.md](.agents/skills/own-the-why/SKILL.md) に従って行う。質問・回答・理由・会話参照は `docs/decisions/` に個別 Markdown で残す（`docs/DECISIONS.md` の D-XXX とは別系統）。深掘りが必要な判断では同梱の `.agents/skills/dig` / `.agents/skills/grilling` を使い、質問形式は `.agents/skills/own-the-why/references/question-format.md` に従う
- 「コードから観測した事実」と「PM 確認待ち」を分けて記録する。採用済みの構成を勝手に取り消したり置き換えたりしない
- 技術選定を行う・変える場合は `docs/DECISIONS.md` に候補（2つ以上）・メリット/デメリット・捨てた理由を記録する
- 数値・統計・引用を書くときは出典を同じ行に付ける。根拠がなければ「（未記入: 要調査）」のまま残し、推測で埋めない
- API キー・サービスアカウント鍵などの秘密情報をコミットしない。環境変数・Secret Manager 経由にする
- push・PR 作成・デプロイは人間が承認した範囲で行う。依頼で承認済みの操作は再確認不要。技術・インフラの新たな採用や設定を依頼から推測して追加しない


### レビュー必須条件（要相談PR）

次のいずれかに当てはまる変更は、PRで相談し、レビュー・承認を受けてからマージする。

- 有料サービス・APIの追加など、コストが発生するもの
- 環境変数や秘密情報（APIキーなど）に関わる変更
- DB構造やディレクトリ構成など、全員に影響する変更

いずれにも当てはまらない変更は、PRのレビューなしでマージしてよい。レビュー要否はこの節を基準とし、READMEの「1人レビューでmerge」より優先する。必要なテスト・チェックの実施は省略しない。

### 環境・デプロイのルール

stg と prod は 1 つの GCP プロジェクト `df-2026-t184-prod` に同居している。構成の詳細は [docs/environments.md](docs/environments.md) にある。

- デプロイは 1 環境ずつ、対象を明示して行う（例: `firebase deploy --only apphosting:yorimichi-stg`、`firebase deploy --only firestore:yorimichi-stg`）。`--only` なしの `firebase deploy` や `--only firestore:rules` は両環境に入るため使わない
- Google の API・環境変数・秘密情報を追加・変更するときは [.agents/skills/env-and-api-change/SKILL.md](.agents/skills/env-and-api-change/SKILL.md) の手順に従う。API キーと Secret は stg と prod の両方に用意する
- 有料のリソースや API の作成・有効化は、PR で提案して PM の承認を得てから行う（上の「レビュー必須条件」）
- Firestore のルールは現在すべて拒否になっている。コレクションを読み書きする前に、`firestore.rules` にルールを追加する
- Auth は stg と prod で共有している。stg で作ったアカウントは prod でもログインできる
- ローカル（`NEXT_PUBLIC_APP_ENV=local`）の Firebase はエミュレータ専用。`firebase emulators:start --config firebase.emulator.json --project demo-yorimichi` で起動する

### 相談・連絡の場所

- PRや設計の議論はGitHubで行う。
- 締め切り前や作業が止まっているときなど、急ぎの連絡はDiscordでメンションする。
