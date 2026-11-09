# 環境構成（stg / prod / local）

1 つの GCP プロジェクト `df-2026-t184-prod`（Firebase プロジェクト番号 `1031159186960`）の中に、
stg と prod の 2 環境を同居させている。Auth は環境間で共有、Firestore と App Hosting
バックエンドは環境ごとに分離する。

## リソース一覧

| 種別 | stg | prod |
|---|---|---|
| App Hosting バックエンド | `yorimichi-stg`（Environment name: `stg`） | `yorimichi-prod`（Environment name: `prod`） |
| リージョン | asia-east1 | asia-east1 |
| デフォルトドメイン | `yorimichi-stg--df-2026-t184-prod.asia-east1.hosted.app` | `yorimichi-prod--df-2026-t184-prod.asia-east1.hosted.app` |
| Firestore DB（名前付き） | `yorimichi-stg` | `yorimichi-prod`（削除保護あり） |
| ランタイム SA | `yorimichi-stg@df-2026-t184-prod.iam.gserviceaccount.com` | `yorimichi-prod@df-2026-t184-prod.iam.gserviceaccount.com` |
| Firebase Web アプリ ID | `1:1031159186960:web:98001fdfed19e46405ec95` | `1:1031159186960:web:5a1c4dd734cfeb5405ec95` |
| runConfig | min 0 / max 1 | min 0 / max 2 |

共通: Auth ドメイン `df-2026-t184-prod.firebaseapp.com`、送信者 ID `1031159186960`。

## 環境選択の仕組み（fail closed）

`NEXT_PUBLIC_APP_ENV`（`stg` / `prod` / `local`）で環境を決める。解決ロジックは
`src/lib/env.ts` にあり、クライアント（`src/lib/firebase.ts`）とサーバー
（`src/lib/firebase-admin.ts`）の両方が同じ値を使う。

- `NEXT_PUBLIC_APP_ENV` 未設定:
  - `NODE_ENV=production` ではFirebaseモジュール読み込み時に例外（設定漏れのデプロイを黙って通さない）
  - それ以外（`next dev`、テスト）は `local` として動く
- `stg` / `prod` では `NEXT_PUBLIC_FIREBASE_DATABASE_ID` が必須で、
  値は環境と一致している必要がある（`stg`→`yorimichi-stg`、`prod`→`yorimichi-prod`）。
  不一致・未指定・`(default)` へのフォールバックはすべてFirebaseモジュール読み込み時エラー。
- `local` のFirebase利用は `NEXT_PUBLIC_FIREBASE_EMULATOR=true` が必須。DB ID省略時はエミュレータの `(default)` を使い、名前付きDBは拒否する。
- `stg` / `prod` ではエミュレータフラグを `false` または未設定にする。Admin SDK用のエミュレータホスト変数も解除する。矛盾する設定は拒否する。
- `NEXT_PUBLIC_APP_ENV` の値が `stg`/`prod`/`local` 以外なら常にエラー。

これらは `src/lib/env.test.ts` でテスト済み（`npm test`）。
検査は Firebase モジュールを読み込んだ時に実行される。現在の画面・APIはまだこの
モジュールを利用していないため、アプリ全体の起動時検査やDB接続の実機検証は未実施。

## 設定ファイルの対応

| ファイル | 役割 |
|---|---|
| `apphosting.yaml` | 全環境共通のフォールバック（cpu/memory/min0/max1 + 共有の公開値） |
| `apphosting.stg.yaml` | stg 固有（APP_ENV、DB ID、stg Web アプリ ID、STG_* シークレット参照、max 1） |
| `apphosting.prod.yaml` | prod 固有（同上 PROD_* 版、max 2） |
| `firebase.json` | 名前付き DB ごとの rules/indexes、App Hosting ローカルソース設定、エミュレータ |
| `firebase.emulator.json` | local専用の単一DB・ルール・エミュレータ設定 |
| `.firebaserc` | デフォルトプロジェクト `df-2026-t184-prod` |
| `.env.local` | ローカル開発用（`.env.example` をコピー。コミットしない） |

App Hosting はロールアウト時にバックエンドの Environment name に対応する
`apphosting.<env>.yaml` を探し、`apphosting.yaml` にフィールド単位でマージする
（同名変数は環境別ファイルが優先）。

## シークレット（Secret Manager）

値はリポジトリに書かない。`apphosting.<env>.yaml` では名前参照のみ。

| 変数名（アプリ側） | stg のシークレット | prod のシークレット |
|---|---|---|
| `GEMINI_API_KEY` | `STG_GEMINI_API_KEY` | `PROD_GEMINI_API_KEY` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `STG_GOOGLE_MAPS_API_KEY` | `PROD_GOOGLE_MAPS_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `STG_FIREBASE_API_KEY` | `PROD_FIREBASE_API_KEY` |

- 各シークレットの `secretAccessor` は対応環境のランタイム SA のみ（stg の SA は
  PROD_* にアクセスできない）。
- Maps キー制限: stg は stg ドメイン + `localhost:3000` / `127.0.0.1:3000`、
  prod は prod ドメインのみ（HTTP リファラー制限）。
- Gemini キー制限: Generative Language API（モデル一覧取得で検証済み）。
- Maps / Firebase API キーは BUILD 時にも必要（`NEXT_PUBLIC_` はビルド時に
  バンドルへインライン化されるため `availability: [BUILD, RUNTIME]`）。

## Auth（共有）

Identity Platform で初期化済み・メール/パスワード有効。ユーザーは未作成。
stg / prod で同じ Auth を共有するため、同じアカウントが両環境で使える
（テストアカウントは実データに注意）。Firestore ルールが全拒否のため、
ログインできても現状データの読み書きはできない。

## Firestore

- 両 DB に `firestore.rules`（全拒否）がデプロイ済み。リポジトリ側も全拒否に揃えてある。
  コレクションを開くのは実装時にルールを追加してから。
- 無料枠の DB は 1 プロジェクト 1 個まで: `yorimichi-stg` が freeTier であり、
  `yorimichi-prod` は課金対象（prod は削除保護も付いている）。
- クライアント SDK・admin SDK とも `NEXT_PUBLIC_FIREBASE_DATABASE_ID` で
  名前付き DB を明示選択する（クラウド側には `(default)` DB は作成していない）。

## IAM / 権限の境界

- ランタイム SA には `roles/datastore.user` が「自分の環境の DB のみ」に
  スコープされて付与されている（`resource.name` 条件）。stg の SA は prod の
  DB を読み書きできない。
- `roles/firebaseapphosting.computeRunner` を付与済み（App Hosting のビルド・実行用）。
- admin SDK はセキュリティルールをバイパスするため、上記 IAM スコープが
  環境分離の実効的な境界になる。ルールと IAM の両方で fail closed にしている。

## 請求 / 予算（変更しないこと）

既存の予算アラート 15 件（全体累計 3,000 JPY、月次純額 100 JPY、
サービス別累計 500 JPY × 13）。通知先 `yamadamei0512@gmail.com`。
これらの設定は変更しない。

## ローカル開発

```bash
cp .env.example .env.local   # 値を入れる（APP_ID / API キー類）
npm run dev
```

- 既定の `local` はエミュレータ専用。`.env.example` のまま次を実行する:
  ```bash
  firebase emulators:start --config firebase.emulator.json --project demo-yorimichi
  ```
  複数DB用の `firebase.json` で起動するとルールが読み込まれないCLIがあるため、
  必ず専用設定を指定する。localではこの設定の `(default)` DBだけを許可する。
  APIキーとprojectIdが空なら `demo-key` / `demo-yorimichi` を補う。ブラウザと
  Admin SDKの両方がAuth `localhost:9099`、Firestore `localhost:8080` に接続する。
  Admin SDKでは `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` を自動設定する。
  これらを手動設定した場合、上記の値と異なる接続先は拒否する。
- stg の実 DB に接続したい場合: `.env.local` に `NEXT_PUBLIC_APP_ENV=stg` と
  `NEXT_PUBLIC_FIREBASE_DATABASE_ID=yorimichi-stg`、`NEXT_PUBLIC_FIREBASE_EMULATOR=false`、stg の Web アプリ設定値、
  `gcloud auth application-default login` を済ませる。ルールが全拒否なので
  クライアントからは読み書きできず、admin SDK（サーバー側）のみ IAM が許す範囲で動く。
- `npm run build` など `NODE_ENV=production` の実行では APP_ENV が必須。
  ローカルで本番ビルドを試す場合も `.env.local` の `NEXT_PUBLIC_APP_ENV=local`
  または `stg` で動く。

## デプロイ状況と手順（デプロイ readiness）

現状: バックエンド作成済みだが、ビルド・ロールアウト・GitHub 接続は未設定。
デプロイするときは 1 環境ずつ明示的に実行する（両環境に同時デプロイしない）。

```bash
# App Hosting（ローカルソースから。firebase-tools 14.4+ 必須）
firebase deploy --only apphosting:yorimichi-stg
firebase deploy --only apphosting:yorimichi-prod

# Firestore ルール / インデックス（DB 単位で指定する）
firebase deploy --only firestore:yorimichi-stg
firebase deploy --only firestore:yorimichi-prod
```

注意:

- `firebase deploy`（`--only` なし）は apphosting の両バックエンドと両 DB に
  デプロイしてしまうため使わない。
- 複数 DB 構成では `firebase deploy --only firestore:rules` / `:indexes` は
  は対象DBを明示しないため使わない。CLIのバージョンによって対象範囲や動作が異なる。
  必ず `firestore:<databaseId>` まで書く。
- 初回のローカルソースデプロイは、そのロケーションで初めての場合
  ソース保管用 GCS バケットの作成と App Hosting SA への権限付与が走り、
  Owner または IAM Admin 相当の権限が必要。
- Cloud Storage（アプリ用バケット）は未プロビジョニング。Storage を使う場合は
  別途作成とルール整備が必要（`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` も未使用）。

## CI/CD（GitHub Actions → App Hosting）

PRの作成・更新ではCI成功後に共有stgへ、mainへのマージ（push）ではCI成功後にprodへデプロイする。
ワークフローはmainに入ってから有効になる。PR #12の環境設定が前提。

### 実行条件と接続先

| 対象 | 条件 | バックエンド |
| --- | --- | --- |
| stg | 同一リポジトリ・main向け・openのPR。最新headのCI成功 | yorimichi-stg |
| prod | 現在のmain head、そのpush CIの最新attemptが成功 | yorimichi-prod |

`workflow_run`でmainのワークフローを実行する。同名の別CIを拾わないようパスも確認する。
fork・閉じたPR・古いSHA・`.github/`を変更するPRはstgへ自動デプロイしない。
`.github/`を変更するPRはレビュー後にmainへ取り込み、別のアプリ変更PRで確認する。

stgはPRごとのプレビューではなく共用。最後にデプロイされた内容が表示される。
両環境とも同時に1ジョブだけ実行し、実行中のジョブを新しいジョブでキャンセルしない。

prodの選定は**トリガーとなったイベントのSHAではなく、ロック取得後に再解決する**
（`scripts/check-deploy-candidate.py`）。GitHub concurrencyはFIFOを保証せず、
`cancel-in-progress: false` でも古いCI再実行が最新main用のpending jobを
置き換え得る。そこでジョブは開始時に現在のmain headと、そのSHAに対する
正規のpush CI runの**最新attempt**をAPIで読み直し、成功しているときだけ
そのSHAをデプロイする。古いイベントが発火した場合でもデプロイされるのは
常に現在のmainであり、最新mainのCIが未成功なら何もデプロイしない
（古い成功SHAへのフォールバックはしない）。ロールアウト待機の直前にも
再解決し、選定SHAが変わっていればskipする（新しいmainはそれ自身の
workflow_runが別ジョブで処理する）。sourceのcheckoutはこの選定SHAに一致させる。

### stg デプロイ結果の PR Checks への表示（Deploy / stg status）

`deploy-stg.yml` の `status-pending` / `status` ジョブが、CIイベントの
head SHA に `Deploy / stg` の commit status を投稿する。PRのChecks欄に
pending / success / failure / error として表示され、`target_url` は
該当するDeploy workflowのActions run URLを指す。

- `status-pending` はdeployジョブと同じ起動条件で先行して `pending` を投稿する。
- `status` は `needs: deploy` + `always()` で、deployの結果（成功・失敗・
  キャンセル・スキップ）を `success` / `failure` / `error` として最終投稿する。
- `success` は deploy+verify+smoke の全成功（`deployed == 'true'`）のときだけ。
  skip・paused（`DEPLOY_STG_PAUSED=true`）・stale candidate は `error`。
  キャンセル・タイムアウトも `error`。
- `statuses: write` はこの2ジョブだけに分離して付与（`id-token` なし、
  GCP権限なし）。スクリプト（`scripts/report-deploy-status.py`）は
  trusted=main のcheckoutだけから実行し、PRソースでstatusを偽装しない。
- 上書き防止: 投稿前に「このrunを起こしたCI runが当該SHAの最新runかつ
  最新attemptか」をAPIで再確認し、古いrerun・並行run・キャンセルが
  新しい結果を上書きしない。
- pendingは「CIイベントhead == 現在のopen・同一repo・main向けPRのhead」を
  APIで確認したときだけ投稿する（stale SHAには投稿しない）。
- 別repo・CI失敗のworkflow_runイベントには一切投稿しない。

### stg デプロイ結果の PR コメントへの記録

デプロイと smoke check が成功すると、`report` ジョブが対象 PR へ
`<!-- STG_DEPLOY_STATUS -->` マーカー付きの**専用コメントを1件投稿**する。
内容は stg URL、デプロイ SHA、ワークフロー実行リンク、記録日時、
Firestore `yorimichi-stg`（`df-2026-t184-prod`）へのコンソールリンク、
「共有 stg/DB は PR 専用ではなく他 PR で上書きされ得る」注記と
「このコメントは投稿時点の履歴」の注記のみで、認証情報や API キーは含まない。
古いコメントは編集・削除せず履歴として残る。

- report ジョブは deploy ジョブの成功を前提に別ジョブとして動き、
  `issues: write` + `pull-requests: read` だけを持つ（`id-token` なし、GCP 権限なし）。
- main 由来のスクリプト（`scripts/report-stg-deploy.py`）だけを実行し、
  PR ソースや成果物は一切使わない。
- 追記型であり、**PR 本文・他者のコメントは一切変更しない**（PATCHしない）。
  人の編集との競合は起きない。
- 同じワークフロー実行の再投稿防止は、全コメントをページングして
  `github-actions[bot]` 作者＋マーカー＋run URL が一致するコメントを探して
  行う。bot以外が書いたマーカーは重複証拠として採用しない。
- report の concurrency group は run 単位（`github.run_id`）。
  全PR共通のgroupだと、待機中の別PRの報告がpending置換で消えるため。
- PR が open・main 向け・同一リポジトリ・head SHA 不変でない場合は投稿しない。
- Firebase **Hosting** には PR ごとの自動プレビューコメントがあるが、
  これは App Hosting 用に GitHub Actions で実装した独自の仕組み。
  Hosting 版はサイト単位の一時プレビューであり、本リポジトリの
  共有 stg バックエンドとは役割が異なる。

### 認証とソースの扱い

- `google-github-actions/auth@v3`のOIDCを使う。長期のSA鍵は作らない。
- WIFの条件をrepository/ownerの数値ID、`event_name=workflow_run`、main ref、
  環境別の**workflow_ref完全一致**に固定する。各providerが固定の
  `deploy_environment`属性を付け、対応するdeploy SAだけ借用できる。
- GitHub Environmentsの有料プランには依存しない。接続先はrepository variablesに保存する。
- PRソースは`source/`、main由来のデプロイスクリプトは`trusted/`へ別々にcheckoutする。
  checkout認証は永続化しない。OIDCファイルはworkspace直下に置かれ、アップロード対象の
  `source/`の外にある。`credentials_file_path`という非対応inputは使わない。
- バックエンドの `environment` に加えて `serviceAccount` が
  `yorimichi-<env>@df-2026-t184-prod.iam.gserviceaccount.com` と一致することを
  デプロイ前にAPIで確認する。一致しなければ失敗させる。
- PR内のfirebase.jsonは使わず、固定のbackend/rootDir/ignoreを持つ設定を生成する。
  App Hosting YAMLもmainからコピーする。PRのhooks・localBuild・本番secret指定を取り込まない。
  シンボリックリンクを含むソースは拒否する。PR内のコードはGitHubの認証済みrunnerで実行せず、
  App Hosting側でビルドする。

stgで動くアプリコードにはstgの実行権限と秘密情報が渡る。Authは同一PJで共有される。
同一PJ内の環境分離は、別PJと同等の隔離ではない。

### 基盤設定

```bash
bash scripts/bootstrap-github-deploy.sh --apply
```

プロジェクトと操作アカウントをスクリプト内で固定する。対象リポジトリも明示する。
API、deploy SA、CLI既定compute SA、ソースバケット、カスタムロール、WIFを作成する。
ソースバケットのオブジェクトは30日で削除する。APIキーや秘密の値は読み出さない。

deploy SAにはApp Hosting viewer、Service Usage Consumer、バケット一覧、ソースバケットへの
objectCreator、既定compute SAと対応環境runtime SAのactAsを与える。
builds.create/rollouts.createは**deploy-envタグ条件**（`resource.matchTagId`）で付与する。
タグはプロジェクト `df-2026-t184-prod` スコープのタグキー `deploy-env`
（`tagKeys/281481181339464`、既存作成済みを再利用）の値 `stg` / `prod` を、
各backendへ `--location=asia-east1` で**直接bind**する。プロジェクトへの
タグbindは環境区別が消えるため行わない。
（旧来の `resource.type`/`resource.name` 条件はApp Hostingのbuilds.createが
resource属性を供給しないため常に不成立だった。失敗run 42590117353を参照。）
**条件付き権限の実API評価は初回デプロイで検証する。失敗時に無条件の権限へ自動変更しない。**
CLI既定compute SAの4ロールはfirebase-toolsのprovision処理に合わせている。

根拠: [firebase-tools 15.35.0](https://github.com/firebase/firebase-tools/tree/v15.35.0/src/deploy/apphosting)、
[CLIのバックエンド準備](https://github.com/firebase/firebase-tools/blob/v15.35.0/src/apphosting/backend.ts)、
[認証Actionの公式inputs](https://github.com/google-github-actions/auth/blob/v3/action.yml)、
[App Hostingのソースデプロイ](https://firebase.google.com/docs/app-hosting/alt-deploy)。

初回bootstrapは`DEPLOY_STG_PAUSED` / `DEPLOY_PROD_PAUSED`を`true`で作る。
再実行時には既存値を維持する。この停止スイッチは新しいデプロイだけを止める。
稼働中サービスや課金は止まらない。

#### 初回有効化の手順（現状）

GitHub variables は `DEPLOY_STG_PAUSED=true` / `DEPLOY_PROD_PAUSED=true` が
設定・readback済み。**このPRをmainにマージしてもデプロイは自動実行されない**
（workflowのjob条件がpause変数を見る）。有効化は以下の順で、各段階の確認を
済ませてから人間が変数を`false`にする。エージェントがpauseを自動解除しない。

1. 権限検証: deploy SAのタグ条件付きロール（builds.create/rollouts.create）が
   意図どおり評価されるかを確認する。**失敗しても無条件の権限へ自動で
   切り替えない**（権限拡大fallbackは行わない）。Policy Troubleshooterは
   App Hosting backendのタグ条件を評価できない（UNKNOWN_INFOが返る）ため、
   実証は実デプロイの成功/失敗で行う。
2. `DEPLOY_STG_PAUSED`のみ`false`にする。
3. アプリ変更のPRを立てて、stgでOIDCトークン交換・ビルド・ロールアウト・
   smoke check・PRコメント投稿・`Deploy / stg` statusの推移が実際に成功することを確認する。
   ここまで確認できた時点が「stgの実機検証済み」。
4. `DEPLOY_PROD_PAUSED`を`false`にする。
5. mainへのpush CI成功（必要なら既存の成功runを再実行）でprodへの
   デプロイが走ることを確認する。prodの無条件自動有効化はしない。

CIのpassは実機検証ではない。OIDC交換・builds/rollouts作成・rollout成功は
実際にstgへデプロイして初めて確認できる。

##### 確認済み・未確認のリスク（受容済みとは書かない）

- deploy SAのタグ条件付き`builds.create`/`rollouts.create`は、
  条件が実APIで意図どおり評価されるか**未実測**。初回デプロイで検証する。
  旧来の`resource.name`条件は実デプロイで403が確定済み（下記「2026-11-09の検証」）。
- `apphosting.<env>.yaml`の`availability: [BUILD, RUNTIME]`シークレットを
  ビルド側で誰が解決するか（compute SA/サービスエージェント/他）は**未実測**。
- [公式Backend API仕様](https://firebase.google.com/docs/reference/apphosting/rest/v1beta/projects.locations.backends)では `serviceAccount` はCloud BuildとCloud Runの両方に使われる。
  2026-11-09のGETで、両backendがそれぞれ `yorimichi-stg@` / `yorimichi-prod@` を指定していることを確認した。
  PRのinstall/buildコードもこの主体で動く前提で権限を評価する。既定の `firebase-app-hosting-compute` に広い権限があることは確認したが、
  カスタムSA指定時に必ず既定SAでビルドされるとは断定しない。実Cloud BuildのserviceAccountは初回実行で確認する。
- stg/prodは同一GCPプロジェクト・同一Auth（ユーザー共有）。完全な隔離ではない。
- workflowがsource checkoutしたコードをApp Hostingへ送るため、
  同一リポジトリのPRコードが共有stgで動く。`.github/`変更PRは除外済みだが、
  アプリコードの意図しない挙動まで防ぐものではない。

### 検証と運用上の制限

`python3 scripts/test-deploy.py`で古いSHA・閉じたPR・fork・workflow変更・
不正なデプロイ設定・シンボリックリンクの拒否、prodの再解決（最新attempt失敗・
実行中の不採用、古い成功SHAへの非フォールバック、APIページング越しの選定）、
ロールアウト一覧のページング・PAUSED中断・時刻+ラベル相関、
レポートの専用コメント投稿（bot作者照合・重複抑止・非適格不投稿）を検証する。
`bash scripts/test-branch-delete.sh`はローカルbareリポジトリで
`--force-with-lease`削除が競合pushを失わないことを実証し、CIで実行する。

ロールアウト関連は `scripts/apphosting-rollouts.py` に集約し、listは
`nextPageToken`を全ページ辿る（先頭10/20件だけを見ない）。

- `wait`: QUEUED/PENDING_BUILD/PROGRESSING が無くなるまで待つ。
  **PAUSEDがあれば名前付きで即失敗**する。黙って待ち続けると、
  誰かがクラウド側で再開したrolloutとデプロイが競合し得るため。
- `verify`: このジョブの時間窓（JOB_START以降・誤差60秒）に作成され、
  `deployment-tool`ラベルが`cli-firebase`で始まる最新rolloutが
  SUCCEEDEDであることを確認する。firebase-tools 15.35.0のCLIは
  rollout/operation IDを標準出力に出さないため、相関は「時刻窓＋
  CLI作成ラベル」までであり、同時刻に他のCLIデプロイがあった場合まで
  完全には区別できない（完全相関とは呼ばない）。
- 外部から同時に手動デプロイしないこと。ジョブを手動キャンセルしても
  クラウド側の処理は残る。

OIDCの実トークン交換とビルド・公開はmainへの取り込み後に検証する。
ロールバックはmainにrevertを入れてCIを通す。prodは古いCI再実行が
トリガーでも常に現在のmainを再解決するため巻き戻しは起きない。
クレジット終了時の自動停止は未設定。PR更新のたびにビルド費用が発生し得る。

### マージ後のリモートブランチ削除

`delete-merged-branch.yml`はマージされた同一リポジトリのPRを対象に、作業ブランチを削除する。
main・マージ先・他のopen PRで使われているブランチ・長命ブランチ名
（main/master/develop/development/staging/stg/prod/production/gh-pages/trunk/release系/hotfix系）は削除しない。
削除は`git push --force-with-lease=<ref>:<マージhead SHA>`で行い、
**サーバー側で原子的に適用される**（getRef→deleteRefのTOCTOUを解消）。
マージ後にブランチへ新しいpushがあればleaseが拒否され、そのコミットは残る。
資格情報はGIT_ASKPASS経由の環境変数のみで渡し、URL・argv・ログに載せない。
mainのみcheckoutしてPRコードは実行せず、GitHubの保護ルールも回避しない。
ローカルブランチは残る。

残る競合（原子的にできないものとして記録）: open PRの確認と削除の間に
**新しいPRが同じブランチで開かれた**場合は検知できない。運用回避として、
マージ済みブランチを別PRで再利用しないこと。
既存のマージ済みブランチは一括削除しない。ワークフローがmainへ入った後のマージから適用する。
リポジトリ標準の自動削除設定は管理者権限がないため未変更。

### 2026-11-09の読み取り検証

- backendのenvironmentとserviceAccountは環境ごとの期待値と一致。
- 各STG_/PROD_シークレット3件の個別IAMは、対応する環境SAだけにsecretAccessorを付与。値は読んでいない。
- project IAMのdatastore.userは対応DBのresource.name条件付き。これらは設定の確認であり実アクセスの許可/拒否テストではない。
- Policy Troubleshooter APIを有効化し、stg deploy SAのstg backendへのbuilds.createを照会したが、`UNKNOWN_CONDITIONAL` とdeny説明の内部エラーを返した。ALLOW確認として扱わず、権限も広げていない。
- 両デプロイ停止変数はtrue。実OIDC交換・build・rollout・通知・ブランチ削除は未実施。

### 2026-11-09の実デプロイ結果とタグ条件への移行

- stg初回デプロイ（PR #21発、main head `6cf6670` 由来のrun
  [42590117353](https://github.com/shun-os/df-2026-t184/actions/runs/42590117353)）は
  **Deploy ステップで失敗**。CI成功・OIDC認証・ソースGCSアップロードは成功し、
  `firebaseapphosting.builds.create` が403で拒否された。旧条件
  `resource.type`/`resource.name.endsWith` はApp Hostingの当該呼び出しが
  resource属性を供給しないため常に不成立（Audit logのresourceAttributesも空）。
- 併せて、workflow_run由来のrunはmain headにチェックが付きPRにはCIしか
  表示されない欠陥が判明（失敗runがPR上で見えない）。`Deploy / stg`の
  commit status表示で対処（上記PR Checks節）。
- 対処: backendへ `deploy-env` タグを直接bindし、IAM条件を
  `resource.matchTagId` へ置換。作成値は `stg`=`tagValues/281480213023116`、
  `prod`=`tagValues/281482408117851`（既存key `tagKeys/281481181339464` の下、
  `df-2026-t184-prod/deploy-env`）。stg側deploy SA bindingのみ置換済み。
  prod deploy SAのbindingは旧式のまま（prodはpaused、bootstrap適用で移行）。
- Policy Troubleshooter v3（実タグを取得して評価）でも
  `UNKNOWN_INFO`が返り、effectiveTagsが取得されない（App Hosting backendは
  troubleshooterのタグ取得に未対応と観測）。Cloud Asset analyze-iam-policyも
  当該resource名を未対応（INVALID_ARGUMENT）。**UNKNOWNは証明にしない**:
  ALLOW/DENYの実証はpause解除後の実デプロイに委ねる。
- 詳細と判断記録: [decisions/2026-11-09-stg-deploy-fix.md](decisions/2026-11-09-stg-deploy-fix.md)。
