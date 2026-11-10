---
name: loop-status
description: 動いている superloop の状態（合格数・作業中・差し戻し・コンフリクト解消中・採点・費用）をまとめて報告する。読み取りだけで、何も変更しない。
---

# loop-status

1. `superloop status` を実行する
2. `git log --oneline -10` を見る。`logs/run.log` があれば末尾の 20 行も見る
3. 差し戻し中の機能があれば、`.worktrees/<機能ID>/NEXT_FINDINGS.md` の要点を1〜2行で添える
4. 次の項目で報告する
   - 合格 N / M
   - いま動いている機能
   - 差し戻しとその理由
   - 止まっていればその理由（AGENT_STOP・STOP_AFTER・着手できる機能がない・変更なしが続いた）
   - 人間が判断すること

ループを止めるか、再開するか、指示を出すかは人間が決める。このスキルでは `superloop stop` も `superloop steer` も実行しない。
