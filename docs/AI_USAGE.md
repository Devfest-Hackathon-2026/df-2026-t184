# AI の利用箇所（提出用の材料・下書き）

作成: 2026-11-10（F10 worker）。提出フォームの「AI をどの場面でどう使ったか・なぜその場面か」
（`docs/HACKATHON.md` の必須記入、転記）の元データ。**コードと記録から観測した事実だけ**を書く。
提出文の確定・言い換えは PM が行う。

## 1. プロダクトの中で AI を使っている場面

| 場面 | 使い方（観測事実） | 根拠（コード） |
|---|---|---|
| `/walk` の寄り道クエスト生成 | Vertex AI の Gemini（既定 `gemini-3.5-flash-lite`）に、行き先・気分・寄り道時間を渡し、3つのチェックポイントと「その場でできる小さな行動」を JSON スキーマで受け取る | `src/app/api/quests/route.ts`、`src/lib/quest-generation.ts`、`src/lib/prompts/quests.ts`、`src/lib/vertex.ts` |
| プロンプト調整（内部向け） | `/prompt-lab` が `/api/quests` を呼んで出力を確かめる画面。プロダクトの流れには含まない | `src/app/prompt-lab/page.tsx`、`src/components/PromptLab.tsx` |

### その場面に AI を使う理由（コード・判断記録から観測）

- クエストは行き先と気分の組み合わせごとに「裏通り・路地を優先」「実在が確かな場所名」「1文20〜30字の行動」という自由記述の生成物が要るため、事前データではなく生成 AI に任せた（`src/lib/prompts/quests.ts` のシステム指示）
- 出力の形は responseSchema で固定し、形が崩れた応答は失敗として見本に切り替える（`src/lib/quest-generation.ts`）
- Gemini は Vertex AI 経由・ADC 認証にした。理由は、配布クーポンの Google Cloud クレジットを使うため（D-003、`docs/decisions/2026-11-10-vertex-gemini.md` に本人の回答あり）。AI Studio の API キー方式は、前払い残高 0 で 402 になることが確認されたため廃止

### AI をあえて使っていない場面（画面にも区別を表示）

- 思い出カードの文章: 気分ごとの見本文。画面に「AIが写真やメモから書いたものではありません」と注記（`MemoryCard.tsx`）
- ともだちの投稿フィード: 見本データ。「実在の人の投稿ではありません」と注記（`FeedScreen.tsx`）
- 探索中の4段階表示: 演出。「実際に使うのは Gemini と地図の道順だけ」と注記（`LoadingScreen.tsx`）
- `/terrain` の坂・日陰の値: AI ではなく公開データ（国土地理院標高タイル・PLATEAU・NOAA 太陽位置式）からの計算。推定値・現地未検証と画面に記載
- ポイント・称号・所要時間: 固定の決めごと・目安。推定である旨を画面に記載

### AI が失敗したときの設計

- 時間切れ（サーバー 20 秒）・上流エラー・不正な出力・認証失敗・通信失敗・回数制限（429）を `QuestFailure` で区別し、原因つきの知らせとともに見本クエストへ切り替える。流れは止まらない（`src/features/walk/api.ts`、`flow.ts` の `QuestSource.Fallback`）
- 回数制限は IP ごと 1分10回（メモリ内）。Gemini の呼び出し回数＝費用を1人が使い切らないための歯止め（`src/lib/rate-limit.ts`、D-F04）

## 2. 開発の中で AI を使った場面

転記上、AI コーディング支援ツールの利用は可（`docs/HACKATHON.md`）。

- 昼間の開発（11/5〜11/10）: Claude Code 等の AI コーディングエージェントを会話で使い、実装・調査・デプロイ作業を行った（判断記録 `docs/decisions/` 各ファイルの「セッション参照」に Claude Code 経由の会話と記載。例: `2026-11-10-vertex-gemini.md`）
- 夜間の自律ループ（11/10 未明〜朝）: superloop で AI worker（claude）が機能 F01〜F09 を実装、AI 評価役（codex）が判定し、合格した作業は Router（ハーネス）が統合ブランチ（`loop`）へマージした。main へのマージ・prod 確認は午後に人が行う分業（`docs/superloop-brief.md`「午後は人がレビュー・merge・prod 確認・提出物」、`test-results.json`、コミット `feat(Fxx)`・`merge(Fxx)` 系）
- 判断の記録: AI が技術判断をした箇所は `docs/decisions/` に「AI判断・PM確認待ち」として残し、PM の回答があった判断は本人の言葉で記録（`AGENTS.md` の own-the-why 運用）

## 3. 提出文を書くときの注意（事実として）

- 「AI が作ったクエスト」は Gemini が生成した結果で、地点の実在・内容は現地で確かめていない（画面の注記と同じ文言を使うこと）
- 見本・推定値を本物の結果のように書かない（失格条件に抵触するため）
- 「開発を通して得たこと・成長したこと」の欄は人間の所感なので、AI の観測では書けない。PM が記入する
