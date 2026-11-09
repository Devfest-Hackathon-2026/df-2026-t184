# 2026-11-06-shared-question-skills: dig/grilling のPJ同梱と共通質問形式

- 日付: 2026-11-06
- セッション参照: `t3-thread://v1/e6827db4-abbc-46ee-8379-f2f93821a8ab`（メッセージID: 未取得）
- 質問手段: 明示依頼を既存確認として再利用（新たな質問は出していない）
- 深さ: 短い確認の再利用

## Q1: 質問の質・フォーマットをチームで共通化するか

質問文:

> （明示依頼を回答として再利用。新たな質問は出していない）

回答（本人の発言を引用）:

> いやだってさ別に その質問のクオリティみたいな話だから 共通で使用するskillsとかあってもいいと思うんですが その質問のフォーマット的な意味でも

選定理由: 上の引用が本人の発言そのもの。「質問のクオリティ」「質問のフォーマット的な意味でも」以上の理由・背景を AI が推測して補完しない
未選択の候補の扱い: 候補比較を行っていない（明示依頼のため）

## 決定

- `.agents/skills/dig/`・`.agents/skills/grilling/` をPJ同梱スキルとして作成（個人スキルへの実行依存なし）
- 共通質問形式を `.agents/skills/own-the-why/references/question-format.md` に集約し、両スキルから相対リンク
- own-the-why は開始判断と振り分け役に絞り、同梱スキルへの相対リンクに更新
- 出典: dig は dig 3.0.1（作者: Kuu / fumiya-kume/claude-code、GPL-3.0、ローカルコピー SHA-256 `619b83ab...`）由来、grilling はローカル個人スキル（SHA-256 `10ff989e...`）由来。適応点は各 SKILL.md の「出典・適応」節

## 結果・検証（セッション終了時追記）

- 成果物: `.agents/skills/dig/SKILL.md`、`.agents/skills/grilling/SKILL.md`、`.agents/skills/own-the-why/references/question-format.md`、own-the-why の更新、`AGENTS.md` の導線、本記録
- 検証: quick_validate.py（3スキル）合格、リンク解決確認、`git diff --check` 合格。通常新判断・依存判断・回答未取得・個人スキル無し・候補選択だけの5ケースを机上レビュー（質問UIの自動実行テストではない）
- 実装commit: 本記録と同一commit（SHA は親側で追記可能）
- PR: [#3](https://github.com/shun-os/df-2026-t184/pull/3) に同梱予定（push・PR更新は親が実施）
