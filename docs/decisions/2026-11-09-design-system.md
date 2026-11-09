# 2026-11-09-design-system: PR #4 への SmartHR 着想デザインシステム導入

- 日付: 2026-11-09
- セッション参照: T3 Code の子スレッド（実装サブエージェント）。スレッドID・メッセージID: 未取得
- 質問手段: 親エージェントからの実装ブリーフ（本会話冒頭の指示文）。追加の質問は行わず、ブリーフの指定を本人の判断として扱った
- 深さ: 短い確認のみ（新しい未決定なし）

## Q: 目的・スコープ

回答（ブリーフの指示を引用・要約。本人の発言ではなく親エージェント経由の依頼文）:

> PR #4（feat/storybook-hypothesis）のモックを最新 main に追従させ、SmartHR に着想を得たデザインシステムを組み込む。既存のステッカー部品を基盤に、プリミティブ/セマンティックトークン・タイポグラフィ/余白/色/フォーカス/状態・アクセシブルなボタン/入力/選択コントロール・Storybook の基盤とコンポーネントカタログ・使い方/アクセシビリティ/コントリビューションの簡潔な文書（出典付き）を作る。main の実アプリ/API 機能と仮説モック・Storybook は両方保持し、モックで実機能を置き換えない。

- 実施した判断（ブリーフの許可範囲内・AI による実装判断。本人の承認ではない）:
  - `page.tsx` は実アプリ（YorimichiApp）のまま保持。マージでモック（WalkApp）に自動解決されていたが、ブリーフの「live functionality を置き換えない」に従い実アプリ側へ戻した
  - SmartHR 依存（smarthr-ui パッケージ）は追加しない。ブリーフも「不要なら依存なし」。借用は構成の考え方のみ
  - フォーカス色は `sky-deep` ではコントラスト不足（紙面と約 2.6:1）のため、最深段 `sky-ink (#2b6ea6)` を追加し `--color-focus` とした。危険色は `coral-ink (#c24914)`（白文字・紙面の両方で 4.5:1 超）
  - `ChoiceChip` は `role="radio"` の button から実 `<input type="radio">` 構成へ変更（矢印キー・SR セマンティクスをブラウザ標準に任せるため）
- 残る未決定: 実アプリ（`/`）側もこのデザインシステムで描き直すかどうか。ブリーフの範囲はモック側の基盤整備であり、実アプリへの適用は依頼されていない

## セッション終了時の追記（2026-11-09・継続セッション）

### 経緯（コードから観測した事実）

- 初回実装ブランチ `t3/smart-design-system`（旧 HEAD `96b2d76`）が、未マージの `setup/stg-prod-environments` 系コミット（`bee8f79`〜`b8a13ca` 等）を祖先に含んでいた
- 継続セッションのブリーフで「実 PR ヘッド `85807bf`（feat/storybook-hypothesis）＋最新 `origin/main`（`59d8b38`）を基底に DS コミットだけ移植せよ」と指示され、ブランチを作り直した。旧履歴は `backup/t3-smart-design-system-96b2d76` に保全
- 移植したコミット: `8f9738c` `0461400` `6823859` `1ce62ea` `96b2d76`（`03c8acd..96b2d76` の範囲）
- `03c8acd`（server-only 依存）は stg/prod 系ではないが、main の `src/lib/firebase-admin.ts` が `import "server-only"` しつつ依存未宣言のため、同等の修正を新規コミットで再適用した
- `85807bf` 自身が `page.tsx` をモック（WalkApp）に差し替え `YorimichiApp.tsx` を削除していたため、main の実アプリを復元した（前セッションと同じ方針）
- main の実アプリが参照する `--font-zen` が新レイアウトで未定義になっていたため、`fonts.ts` に `Zen_Kaku_Gothic_New` を復帰させた

### 判断の帰属

- 本人（ブリーフ経由）の判断: 基底を `85807bf`＋最新 main にすること、stg/prod 系コミットを除外すること、実アプリとモックを両立させモックは Storybook 側に留めること、SmartHR 着想 DS を入れること
- AI の実装判断（前セッションから継続・変更なし）: smarthr-ui 非導入、`sky-ink`/`coral-ink` の最深段追加、ChoiceChip の実ラジオ化、page.tsx の実アプリ復帰
- AI の実装判断（本セッション追加）: `--font-zen` の復帰（実アプリ退行の修正）、`server-only` の再適用、モック画面のフォーカス輪郭を `focus-ring`（sky-ink 5.1:1）へ統一（旧 `outline-sky-deep` は紙面で約 2.5:1）、disabled チップ/チェックボックスのカーソル競合（`cursor-pointer` が `cursor-not-allowed` をカスケードで上書き）の修正

### 結果・検証・commit・PR

- ブランチ: `t3/smart-design-system`（ローカル。push・PR 更新は親エージェントの承認待ち）
- commit: このファイル更新時点の `git log` を参照（マージ基底 + DS 5件 + page.tsx 復帰 + server-only + フォント復帰）
- 検証: `npm ci` / `npm test` / `npx tsc --noEmit` / `npm run lint` / `npm run build-storybook` / `npm run build` を実施し、結果は親エージェントへ報告
- PR: 未作成・未更新（push 待ち）
