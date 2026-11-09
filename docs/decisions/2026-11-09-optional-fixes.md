# 2026-11-09-optional-fixes: パネルレビュー optional 指摘の修正と Astryx 比較資料

- 日付: 2026-11-09
- セッション参照: T3 Code の子スレッド（実装サブエージェント）。スレッドID・メッセージID: 未取得
- 質問手段: 親エージェントからの実装ブリーフ（本会話冒頭の指示文）。追加の質問は行わず、ブリーフの指定を本人の判断として扱った
- 深さ: 短い確認のみ（新しい技術選定・インフラ判断なし）

## Q: 目的・スコープ

回答（ブリーフの指示を引用・要約。本人の発言ではなく親エージェント経由の依頼文）:

> 既存の隔離 checkout（HEAD `2f3d19f`、branch `t3/smart-design-system`）でのみ作業する。optional 指摘のうち直す価値があると判断したものをテスト付きで直す。対象として挙げられたのは: 画面遷移のフォーカス管理（loading/route の見出しと main ランドマークを含む）、永続的なライブ通知領域と正直なモックのシェア文言、レスポンシブ枠の max-width、入力に戻る際の記録喪失の回避（記録を保持する戻る動作と明示的な restart の分離）、モックのグローバル canvas/font スタイルを live の prompt-lab から隔離、読める Stamp・地図注釈色、disabled フィールドのスタイルと文書の整合・選択済みチップの操作、誤解を招く画面単体 story の修正（明確にラベルした意味のある no-op、または実フローの再利用）。ハンコの ink-worn 視覚効果は低優先の評価対象で、説明を付けて残してよい。実アプリ YorimichiApp・API・main の環境設定、確定済みの danger/badge 色、CI のテスト＋Storybook を維持する。Red-Green のテスト、lint・typecheck・CI 環境変数での next build と Storybook ビルドを実行し、最小の日本語 Conventional コミットにする（push は親が行う）。判断記録は本人の承認範囲を正確に反映して更新する。

> あわせて、実コンポーネントの比較資料をリポジトリ外（/tmp/astryx-comparison/comparison.html）に作る。実際の npm パッケージ @astryxdesign/core + @astryxdesign/theme-neutral を使い、meta/astryx の README と公式 Storybook https://astryx.atmeta.com を参照に、左=現行ステッカー部品・右=実 Astryx で同じ日本語ラベル・操作を並べる。Astryx の CSS を偽装しない・近似を本物と呼ばない。リポジトリに恒久的な Astryx 依存を足さない。

- 実施した判断（ブリーフの許可範囲内・AI による実装判断。本人の承認ではない）:
  - 画面遷移のフォーカス: 各画面の h1 にマウント時フォーカスを移す `ScreenHeading` を追加。Loading/Route は `sr-only` の見出しを新設。PaperScreen の内側を `<main>` に変更
  - 戻る動作の分離: `backToInput`（行き先・気分・時間・shots/memos を保持して入力画面へ）を新設し RouteScreen の戻るに適用。`restart` は明示的なやり直しとして従来どおり
  - 通知領域: `aria-live="polite"` の領域を常設し Toast をその中に出す方式に変更。シェア文を「見本：共有リンクは実際にはコピーされません」に訂正
  - グローバル `body` の canvas/font を `.sticker-app`（PaperScreen の外枠）にスコープ化。prompt-lab 等への漏れを解消
  - Stamp・地図の「人が多い通り」注釈を `coral-deep` → `coral-ink`（紙面で 4.5:1 超）へ変更
  - TextField/TextAreaField に disabled の3点（薄い面・細い線・影なし・`cursor-not-allowed`）を追加し `docs/design/design-system.md` の約束と整合。ChoiceChip の選択済みの見た目を `checked` props 条件分岐から `peer-checked:` へ変更し、実 input の状態を表示の真実に揃えた
  - 画面 story: `WalkApp` を初期状態違いで再利用し、押しても進まない静止ローディング・動かない戻るボタンを解消（Loading・Feed は静止画としてラベル明記）
  - レスポンシブ枠: HypothesisFrame・Phone ラッパの固定 `w-97.5` を `w-full max-w-97.5` に変更
  - ink-worn（ハンコのかすれ）は**未修正のまま残す**。`mask-image: noise, linear-gradient(#000,#000)` は `add` 合成で実質全面不透明＝効果が出ていない。正しくやるには「ほぼ不透明で斑点が抜ける」専用マスク素材が必要で、低優先のため今回は説明のみ
  - 比較資料（/tmp/astryx-comparison/）はリポジトリ外の成果物。リポジトリへの Astryx 依存の追加なし

## セッション終了時の追記（2026-11-09）

- commit: `git log`（backToInput、フォーカス管理、通知領域・文言、スコープ化、色、フィールド/チップ、story 修正、storybook 用レスポンシブ枠、判断記録）
- 検証: `npx vitest run` 61 件パス（新規 7 件の red→green を確認）、`npm run lint`、`npx tsc --noEmit`、`npm run build-storybook`、CI 相当のダミー env で `npm run build` 成功
- PR・push: 未実施（親エージェントが扱う）

## 残る未決定

- 実アプリ（`/`）側へのデザインシステム適用は引き続き未依頼のため手を付けない
