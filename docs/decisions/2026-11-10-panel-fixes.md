# 2026-11-10-panel-fixes: PR #33 のパネルレビューの指摘のうち4件を直す

- 日付: 2026-11-10
- 質問手段: チャットでパネルレビュー（claude / security / codex / codex-adversarial）の結果と、直す候補4件を提示
- 回答: 「おk対応して」（PM、4件すべて）
- 深さ: 短い確認のみ

## 直したこと

1. **回数制限を 1分10回 → 60回にした**（`src/lib/rate-limit.ts`）。理由: 会場の Wi-Fi では多人数が同じ IP に見えるため、10回ではデモ中に全員が見本に落ちる（claude・security が同じ指摘）。60 は実測ではなく「数十人が1分に1回ずつ使っても通る」ことからの AI 判断・PM 確認待ち
2. **`/api/gemini` を削除した**。理由: 画面から使われておらず（呼ぶのはテストだけ）、入力の長さ・出力の上限がないまま Vertex AI の課金に届く窓口だった（security の Critical）
3. **`/terrain` の失敗時**（`src/components/TerrainCompare.tsx`）: Routes API の応答を 10 秒で打ち切り、直線で評価する（codex-adversarial）。地形データの取得で HTTP の状態を確かめ、404 の HTML を JSON として読ませない（claude）。どちらも失敗するテストを先に書いて確認した
4. **夜間ループの権限を、その夜に限ると明記した**（`docs/RULES.md`）。`.superloop/config.sh` の `PUSH` を 0 にした（security・claude）

## 直していないこと（既知の制限）

- 建物データの範囲外を「日陰なし」で数える（`scripts/terrain/build-shade-grid.ts`）、終端区間の距離の近似（`src/lib/terrain/geo.ts`）、端数をまとめたときの最大勾配（`src/lib/terrain/elevation.ts`）。データの再生成と数値の再確認が要るため、今日は推定値の既知の制限として扱う
- IPv6 を /64 でまとめない、`x-fah-client-ip` がないときの共通キー、`maxOutputTokens` の未設定、上流の応答本文のログ出力
