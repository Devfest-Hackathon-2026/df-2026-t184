# ステッカー風デザインのルール

寄り道コンパスの見た目は「散歩の手帳に、手書きの文字とシールを貼っていく」世界。
きれいに整った「ちゃんとしたアプリ」には寄せない。主役はマスコットのミチノコ。

トークンの実体は `src/app/globals.css` の `@theme`、部品は `src/components/sticker/`。
トークンの2層構造・フォーカス/状態の約束・部品の足し方は [docs/design/design-system.md](design-system.md) を参照。

## 文字

| 役割 | フォント | クラス |
|---|---|---|
| 見出し・ボタン・数字 | Hachi Maru Pop | `font-hand` |
| 本文・メモ・説明 | Yomogi | `font-note` |

- どちらも Google Fonts。Next では `src/app/fonts.ts` の `next/font`、Storybook では `.storybook/preview-head.html` で読む。
- 太字は使わない（どちらも 400 のみ）。強調は大きさと色、またはマーカーの塗りで出す。

## 色

- 線・影・文字はすべて焦げ茶 `ink`（`#4a3426`）。真っ黒は使わない。補助の文字は `ink-soft`。
- 地は方眼の紙 `paper` にうっすらノイズ（`paper` ユーティリティ）。外枠はクラフト紙（`kraft`）。
- パステルは 6 色。淡い色と濃い色をペアで使う。

| 色 | 淡い（面） | 濃い（印・線） |
|---|---|---|
| ピンク | `bg-pink` | `bg-pink-deep` |
| ミント | `bg-mint` | `bg-mint-deep` |
| 水色 | `bg-sky` | `bg-sky-deep` |
| レモン | `bg-lemon` | `bg-lemon-deep` |
| コーラル | `bg-coral` | `bg-coral-deep` |
| ライラック | `bg-lilac` | `bg-lilac-deep` |

- 主ボタンはレモン、達成・進行はミント、寄り道ルートはピンクの点線、混雑はコーラル。
- 任意の HEX、透明度の修飾子（`/70`）は使わない。足りない色はトークンに足す。

## 形と影

- 縁取りは焦げ茶の 2.5〜3px（`sticker-edge`、`border-3 border-ink`）。
- 影はぼかさない。右下に 3〜5px ずらす（`shadow-sticker-sm` / `shadow-sticker` / `shadow-sticker-lg`）。押したら `shadow-pressed` に縮める。
- 角丸はカード `rounded-(--radius-sticker)`（18px）、チップと入力欄 `rounded-(--radius-chip)`（14px）。

## 傾き

まっすぐ揃えないのがいちばん効く。ただし読む文字の塊は傾けすぎない。

| 対象 | 角度 | トークン |
|---|---|---|
| カード | -0.8° / 1° / -0.5° | `--tilt-left` / `--tilt-right` / `--tilt-slight` |
| 曜日や時間のマス | ±2° | `--tilt-cell` |
| マスコット | 8° | `--tilt-mascot` |
| ハンコ | -12° | `--tilt-stamp` |
| マスキングテープ | -9° / 7° | `Tape` の `angle` |

## ステッカーと飾り

- マスコット・アイコン・芽などは白フチで縁取って浮かせる（`sticker-fringe`、`IconSticker`）。
- 飾りは `Tape`（マステ）、`Doodle`（星・ハート・波線・きらり）、`Stamp`（ハンコ）。
- 飾りは読み上げない（`aria-hidden`）。**文字と操作部の上には絶対に重ねない。** 余白か、カードの角にだけ置く。
- 写真は本物がそろうまでポラロイド枠の見本（`PhotoSlot`）にする。

## マスコット「ミチノコ」

- 方位針の帽子をかぶった、まるい方位磁石。表情は `MascotMood` の 4 種。
  - `Idle`：入力画面で待っている
  - `Thinking`：探索中。針がくるくる回る
  - `Cheer`：見つけた・達成したとき。手を上げる
  - `Calm`：思い出やともだちの投稿を眺めるとき
- どの画面にも必ず出す。せりふは吹き出しで、短く。

## 動き

- 押すと影がつぶれて沈み、ぷるっと戻る（`animate-jelly`）。出てくるものはぽんと出る（`animate-pop-in`）。
- `prefers-reduced-motion` では動きを止める（`globals.css` で一括）。
- `transition-all` は使わない。動かすのは `transform` と `box-shadow` と色だけ。

## 文言

- 平易に、短く。「！」は使わない。見出し・ラベル・ボタンの末尾に「。」を付けない（文章は付ける）。
- ボタンは何が起きるかを書く（「寄り道ルートを作る」「記録して次へ」）。
