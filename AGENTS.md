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
- 「コードから観測した事実」と「PM 確認待ち」を分けて記録する。採用済みの構成を勝手に取り消したり置き換えたりしない
- 技術選定を行う・変える場合は `docs/DECISIONS.md` に候補（2つ以上）・メリット/デメリット・捨てた理由を記録する
- 数値・統計・引用を書くときは出典を同じ行に付ける。根拠がなければ「（未記入: 要調査）」のまま残し、推測で埋めない
- API キー・サービスアカウント鍵などの秘密情報をコミットしない。環境変数・Secret Manager 経由にする
- push・PR 作成・デプロイは人間が承認した範囲で行う。依頼で承認済みの操作は再確認不要。技術・インフラの新たな採用や設定を依頼から推測して追加しない
