# 2026-11-10-F02-root-to-walk: 入口 `/` を `/walk` の体験にする

- 日付: 2026-11-10
- 状態: AI判断・PM確認待ち（superloop の無人 worker が決めた。質問できないため `docs/RULES.md` に従い自分で決めた）
- 依頼: `docs/SPEC.md` の F02「`/` を開くと `/walk` の体験に入る（旧 `YorimichiApp` はルートから外すだけで削除しない）。テストで確認」

## AI の判断

- `src/app/page.tsx` を `redirect("/walk")` だけにした（307）。比較した候補は `docs/DECISIONS.md` の D-F02
- 旧 `YorimichiApp`（`src/components/YorimichiApp.tsx`）は削除していない。`/` から import しなくなっただけ
- 恒久の 308 にしなかった。入口を戻す判断の余地を残すため

## 検証

- `src/app/page.test.tsx`: `/` が `redirect("/walk")` を呼ぶこと、旧ファイルが残っていることを確かめる
- 本番ビルド（`next start`）で `/` が `307` / `location: /walk` を返し、追うと `/walk` の見出しが出ることを確かめた（`evidence/F02/`）

## PM 確認待ち

- `/` を恒久的に `/walk` にするか（308 にするか）、旧画面をいつ消すか
