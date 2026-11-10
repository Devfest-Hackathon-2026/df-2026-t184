# superloop の設定（KEY=値 の行だけを読む。環境変数で渡した値が優先）
WORKER_AGENT=devin
WORKER_MODEL=swe-2-high
PLANNER_AGENT=claude
EVALUATOR_AGENT=codex
PARALLEL=3
WORKER_TIMEOUT_MIN=60
MAX_ITER=30
STOP_AFTER=2026-11-10T12:00:00+09:00
PUSH=0                  # 2026-11-10 の夜間ループ後に止めた。次に回すときは PM が決めて 1 にする
LOOP_BRANCH=loop
# CODEX_EVAL_SANDBOX は lib/agent.sh が設定読み込み前に既定値を入れるため、ここでは効かない。起動時に環境変数で渡す
