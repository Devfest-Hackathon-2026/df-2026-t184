---
name: sticker-design
description: 寄り道コンパスの「手書きステッカー風」デザインで画面や部品を作る・直すときに使う。「ステッカー風で」「いつもの見た目で」と言われたとき、または src/components/sticker や src/features/walk の UI を触るとき。
---

# ステッカー風デザイン

1. まず `docs/design/sticker.md` を全部読む。色・フォント・傾き・影・白フチ・飾り・マスコットのルールはそこにある。
2. 新しい部品は `src/components/sticker/` の既存部品（`StickerButton`、`StickerCard`、`Tape`、`Doodle`、`Stamp`、`IconSticker`、`ChoiceChip`、`TextField`、`Toast`、`Mascot`、`PaperScreen`）を組み合わせて作る。同じ役割の部品を作り直さない。
3. 値は `src/app/globals.css` の `@theme` のトークンだけを使う。足りなければトークンを足してから使う。
4. マスコットをどの画面にも出し、主役にする。
5. 作ったら Storybook に story を足し、`npm run build-storybook` のあとヘッドレス Chrome でスクリーンショットを撮って見る。直す→撮るを 2 回以上くり返す。特に、マステや落書きが文字にかぶっていないか、傾けた部品が枠で切れていないかを見る。
