# 寄り道コンパス デザインシステム

見た目のルールは `docs/design/style.md`（白い地・細い線・アクセント 1 色のシンプルな表現）。
構成の考え方は SmartHR のデザインシステムを参考にしている。
部品のディレクトリ名 `sticker/` と `Sticker*` という部品名は、以前のステッカー風デザインの名残で、見た目とは関係しない。

- トークンの実体: `src/app/globals.css` の `@theme`
- 部品: `src/components/sticker/`（`index.ts` からまとめて import）
- カタログ: Storybook の **Design System/Catalog**

## トークンの2層構造

SmartHR の「プリミティブ → セマンティック」の考え方を採用する。

### プリミティブトークン（生の値）

`@theme` 前半。文字のグレー 2 段、白い地、線のグレー、アクセントのティール 3 段、
淡い 6 色（タグや小さな塗りに使う面と、その印の色）、コントラストを担保する最深段（`-ink`）を置く。
**コンポーネントからは直接使わない。**

### セマンティックトークン（役割の名前）

`@theme` 後半。プリミティブを参照する。新しい部品・画面は原則こちらだけを使う。

| トークン | 役割 | 参照先 |
|---|---|---|
| `--color-fg` | 本文 | `ink` |
| `--color-fg-subtle` | 補助・ヒント文字 | `ink-soft` |
| `--color-fg-on-deep` | アクセントなど濃い面の上の文字 | 白 |
| `--color-canvas` | 画面の外側の地 | `kraft`（薄いグレー） |
| `--color-surface` | 画面の地 | `paper`（白） |
| `--color-surface-raised` | カード・ボタンの面 | `sticker`（白） |
| `--color-surface-disabled` | 押せない面 | `paper-line` |
| `--color-border` / `--color-border-subtle` | 縁取り / 補助線 | `line` |
| `--color-focus` | フォーカスインジケータ | `sky-ink`（紙面と 5:1 超） |
| `--color-danger` / `--color-danger-surface` | エラー・破壊操作 | `coral-ink` / `coral` |
| `--color-overlay` / `--color-scrim` | 画面を薄く覆う層 | ink ベース 8% / 45% |
| `--spacing-grid` | 余白の基準 22px（`gap-grid` 等） | — |

色を足すときはプリミティブに置き、必要なら意味を持つ参照をセマンティック側に足す。
任意の HEX、透明度修飾子（`/70`）は使わない（`docs/design/style.md` のルール）。

## フォーカスと状態

- `focus-ring` ユーティリティ: 白フチ（`surface-raised`）＋ `--color-focus` の輪郭。
  smarthr-ui の `focusIndicatorStyles`（白いハロー＋輪郭）に倣ったもの。
  新しい操作部品は `focus-visible:focus-ring` を付ける。
- 状態の約束（Button / フィールド / チップで共通）:
  - hover: 面の色が一段濃くなる（ボタンは `accent-strong`、白いボタン・チップは線や面が少し濃くなる）
  - active: わずかに縮む（`scale-[0.98]`）
  - checked（チップ・チェックボックス）: 縁と面がアクセント色になる
  - disabled: `surface-disabled` の面・`fg-subtle` の文字・`cursor-not-allowed`
  - error（入力系）: `aria-invalid` で線が `danger` 色、エラー文は `fg` 相当の `danger` 文字
- `prefers-reduced-motion` では全アニメーション停止（globals.css で一括）

## コンポーネント

`@/components/sticker` から import する。

| 部品 | 用途 | アクセシビリティの要点 |
|---|---|---|
| `StickerButton` | 押せる操作。`variant`: `solid`（既定・アクセント色）/ `plain` / `danger` | 実 `<button>`。`type` 既定は `button` |
| `TextField` / `TextAreaField` | 1行・複数行入力。`label` 必須、`hint`/`error`/`required` | `htmlFor` 関連付け、`aria-invalid`、ヒントとエラーを `aria-describedby` で接続、「必須」バッジ |
| `ChoiceChip` | 1つ選ぶ選択肢。`name` をグループで共有する | 実 `<input type="radio">` を内包。Tab で選択肢へ、矢印キーで移動（ブラウザ標準） |
| `StickerCheckbox` | オン/オフの項目 | 実 `<input type="checkbox">`。ラベル全体がクリック域 |
| `Stack` / `Cluster` | 縦積み / 横並び折り返しレイアウト | — |
| `VisuallyHidden` | 目に見せない補足文字 | `sr-only` のラッパー |
| `StickerCard` `Tape` `Doodle` `Stamp` `IconSticker` `Mascot` `SpeechBubble` `Toast` `PaperScreen` | 飾り・レイアウト（既存） | 飾りは `aria-hidden`、文字・操作部の上に重ねない |

### ラジオ・チェックボックスの設計

中身は本物の `<input>`（`sr-only` で隠す）＋装飾の兄弟要素（`peer-checked:` 等で見た目を変える）。
smarthr-ui の Checkbox と同じ構成で、キーボード操作・スクリーンリーダー・フォーム送信はブラウザ標準に任せる。
強制カラーモード（Windows ハイコントラスト等）では `forced-colors:not-sr-only` でネイティブのコントロールを表示する。

### 使い方の例

```tsx
import { ButtonVariant, ChoiceChip, StickerButton, StickerCheckbox, TextField } from "@/components/sticker";

<TextField id="dest" label="行き先" required hint="駅名や地名で" error={errors.dest} />

<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
  <legend className="float-left w-full p-0 pb-2 font-hand text-sm text-ink">今の気分</legend>
  {MOODS.map((m) => (
    <ChoiceChip key={m.id} name="walk-mood" value={m.id} checked={m.id === mood} onSelect={() => setMood(m.id)}>
      {m.label}
    </ChoiceChip>
  ))}
</fieldset>

<StickerCheckbox onChange={(v) => setKeep(v)}>写真を残す</StickerCheckbox>

<StickerButton type="submit">寄り道ルートを作る</StickerButton>
<StickerButton variant={ButtonVariant.Danger}>削除する</StickerButton>
```

## 部品・トークンを足すとき（コントリビューション）

1. まず既存トークンで済むか確認する。足すならプリミティブに値を置き、役割の名前をセマンティックに作る
2. 操作できる部品は実要素（button/input/a）を使う。`div` の `onClick` で作らない
3. `focus-visible:focus-ring`・disabled の3点（薄い色・影なし・`cursor-not-allowed`）を揃える
4. Storybook に story を足し、`npm test` / `npx tsc --noEmit` / `npm run lint` を通す
5. 飾りのための要素（テープ・落書き・キャラクター）は足さない（`docs/design/style.md`）

## 参考にしたもの

- SmartHR Design System — デザイントークン（色・タイポグラフィ・余白・角丸・影・レイヤー）:
  https://smarthr.design/products/design-tokens/ （2026-11-09 参照）
- SmartHR Design System — コンポーネント / Layout（Stack・Cluster 等）:
  https://smarthr.design/products/components/ , https://smarthr.design/products/components/layout/ （同上）
- smarthr-ui リポジトリ（トークン実装・Checkbox の構成）: https://github.com/kufu/smarthr-ui （同上）

借用しているのは**構成の考え方**（2層トークン・役割名・状態の揃え方・input を隠さず生かす実装）であり、
配色・コンポーネントの見た目は `docs/design/style.md` のとおり独自に決めている。
