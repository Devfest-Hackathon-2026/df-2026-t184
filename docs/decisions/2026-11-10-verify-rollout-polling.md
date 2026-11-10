# stg検証でverifyがPROGRESSINGを即失敗した問題の修正

- 日付: 2026-11-10
- セッション参照: 親エージェント経由の実装委託。メッセージURLは未取得。

## 確認と本人の回答

- 目的・スコープ: `scripts/apphosting-rollouts.py verify` がCLI終了直後の1回のlistで
  PROGRESSINGを即失敗にする誤判定を修正する。Actions run 42657710391 は16:46:53に
  失敗したが、API上で同じrollout（build-2026-11-09-003）は16:46:55にSUCCEEDEDと
  確認済み（親エージェントの実機確認より）。
- 本人の回答: 「おk対応して」（既存の実機検証と不具合対応の承認。本タスクは
  その原因修正として親エージェントから委託。push・merge・クラウド変更は禁止、
  小さい修正の実装とcommitは承認済み）。
- 再利用する判断: 2026-11-10-stg-tag-deploy-verification（実機検証と不具合対応の
  承認、および「おk対応して」の引用元）。
- 選定理由: 承認の引用のみ。追加理由は未回答。
- 手段・深さ: 同一チャットの既存承認を再利用した短い確認。新しい技術選定なし。
  trustedスクリプトのバグ修正であり、PM判断が要る方針・費用・権限の変更を含まない。

## 実装の選択（AIによる設計）

- 最初のlistで選ぶ候補（時間窓＋`deployment-tool=cli-firebase`ラベルの最新）は
  従来どおり1回だけ決め、そのrollout名に固定してVERIFY_DEADLINE_SECONDS
  （既定1800秒）まで再listでポーリングする。候補の再選定はしない。
- SUCCEEDEDのみ成功。QUEUED/PENDING_BUILD/PROGRESSINGは待機し、
  FAILED/PAUSED/`paused`フラグ/未知の状態は即失敗。ピン留めしたrolloutが
  一覧から消えた場合も即失敗（継続待機すると実害のある異常をtimeoutまで
  隠すため）。別rolloutのSUCCEEDEDへは乗り換えない。
- list呼び出しのHTTP timeoutは30秒を追加（urlopenのデフォルトは無期限のため）。

## 結果と検証（セッション終了時）

- 回帰テストをRed→Greenで追加: PROGRESSING→SUCCEEDED待機成功、FAILED/PAUSED/
  pausedフラグ/未知状態の即拒否、PROGRESSING継続のtimeout、ピン留め後に現れた
  新しいCLI rolloutのSUCCEEDEDへの非乗り換え、ピン留めrollout消失の即失敗。
- `python3 scripts/test-deploy.py`: 44テスト全通過。`bash scripts/test-branch-delete.sh`
  通過。`actionlint .github/workflows/*.yml` 通過（workflow変更なし）。
- このスクリプトは trusted=main 由来で実行されるため、修正の有効化はmerge後。
  PR24からは未適用であり、deployの再実行は行っていない。prodのpauseは維持。
- 実機での再確認はmerge後の次回stgデプロイで行う。未検証事項として残す。
