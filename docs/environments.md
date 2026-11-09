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

## CI/CD（GitHub Actions -> App Hosting）

### トリガーと流れ

- **PR オープン / 更新 => stg**: `.github/workflows/deploy-stg.yml`。
  CI（lint/test/build + gitleaks）が `pull_request` イベントで成功したとき、
  `workflow_run` で起動し PR の head_sha を `yorimichi-stg` へデプロイする。
- **main への push（マージ）=> prod**: `.github/workflows/deploy-prod.yml`。
  CI が `push` + `head_branch == 'main'` で成功したとき起動する。
- 両方とも `workflow_run` 起動なので、**ワークフロー定義は常にデフォルト
  ブランチ上のものが使われる**。PR がワークフローを書き換えて prod の
  権限を盗むことはできない（trusted workflow 構成）。
- フォーク PR は `head_repository.fork` チェックで除外。OIDC トークンは
  発行されない（同一リポジトリの PR のみデプロイ対象）。
- **ワークフローが有効になるのは main にマージされてから**。
  `workflow_run` はデフォルトブランチ上のワークフロー定義しか使わない。

### 信頼境界とデプロイスコープの固定

stg デプロイジョブは PR のコードを扱うため、次のガードを入れている:

- `.github/` を変更する PR は stg 自動デプロイをスキップする
  （CI のゲート自体を PR 側で弱められないようにするため。fail-closed。
  該当 PR はデプロイされないだけで、マージ後は信頼済み設定で動く）。
- `firebase.json` の検証（ワークフロー内インラインスクリプト、main 由来で信頼済み）:
  - `predeploy` / `postdeploy` キーを全階層で拒否。`firebase deploy` は
    これらをローカルで `shell: true` 実行するため、OIDC クレデンシャルが
    見えるジョブ内で PR 由来コマンドを走らせない。
  - `--only apphosting:<固定バックエンド>` に対応するエントリが
    ちょうど 1 つ存在し `rootDir == "/"` かつ `localBuild` 未使用であること。
    `ignore` に `.git` / `node_modules` / `.env*` が含まれること。
  - これによりソース設定の改変で stg ジョブを prod バックエンド・
    prod シークレット・prod SA に向けることはできない（バックエンドは
    ワークフロー内の固定値、プロジェクトも `--project` で固定）。
- `google-github-actions/auth` のクレデンシャルファイルは
  `credentials_file_path` で `runner.temp`（ワークスペース外）に置く。
  既定ではワークスペース直下に `gha-creds-*.json` が作られてソース
  アーカイブに混入し得るため、`.gitignore` と `firebase.json` の
  apphosting `ignore` にも `gha-creds-*.json` を追加済み（多重防御）。
- PR のコード自体はクラウド側（Cloud Build / Cloud Run）でビルド・実行
  される。これはプレビューデプロイの性質上避けられず、stg は
  「同一リポジトリのコラボレーターのコードが動く共有環境」として扱う。

### stg は共有環境（latest PR wins）

- stg バックエンドは 1 つだけ。最後に完了したデプロイが提供される。
- `concurrency: apphosting-deploy-stg / cancel-in-progress: true` で
  新しい run が来たら古い run をキャンセルする。
- キャンセルされた run のロールアウトがクラウド側で走り続けた場合に備え、
  デプロイ直前に in-flight ロールアウト（QUEUED/PENDING_BUILD/PROGRESSING/
  PAUSED）の完了を最大 20 分待つ。これで「古いビルドが新しいビルドを
  上書きする」順序逆転を実用上防ぐ。
- 複数 PR で stg を共用するため、PR 単位のプレビュー URL ではない。

### prod の直列化

- `concurrency: apphosting-deploy-prod / cancel-in-progress: false` で
  run を直列化する。実行中のデプロイを殺すとクラウド側ロールアウトだけが
  残って順序が狂い得るため、新しい run はキューして順番に適用する。

### OIDC / Workload Identity Federation

- 長寿命キーは発行しない。`google-github-actions/auth@v3` で OIDC トークンを
  Workload Identity に交換し、環境ごとのデプロイ SA を借用する。
- プロバイダを `github-stg` / `github-prod` に分け、`attribute_condition` で
  リポジトリ数値 ID / owner 数値 ID / `event_name == 'workflow_run'` /
  `environment` クレーム（prod は `ref == refs/heads/main` も）を縛る。
  デプロイトリガーを workflow_run 以外に変える場合は条件の更新も必要。
- デプロイ SA へのなりすまし（`roles/iam.workloadIdentityUser`）は
  `attribute.environment/{env}` の principalSet に限定する。
- GitHub environments `stg` / `prod` はデプロイ可能ブランチを `main` のみに
  限定する。`workflow_run` 実行はデフォルトブランチ ref で走るため動作する。
  フィーチャーブランチへの直接 push では environment を名乗るジョブ自体が
  実行されず、OIDC トークンも発行されない。
- **プラン制限の注意**: GitHub environments は private リポジトリでは
  Pro プラン以上が必要。作成できない場合はブランチ保護が効かず、
  `environment` クレームが OIDC トークンに付かない可能性がある
  （WIF 条件評価が失敗する）。その場合はワークフローの `environment:` を
  外し、WIF 条件と workloadIdentityUser バインドを
  `attribute.job_workflow_ref` ベースに切り替える。
- ワークフローが参照する設定値は環境変数ではなく**リポジトリ変数**
  `GCP_WIF_PROVIDER_STG` / `GCP_DEPLOY_SA_STG` / `GCP_WIF_PROVIDER_PROD` /
  `GCP_DEPLOY_SA_PROD`（environments が使えなくても機能する）。

### デプロイ SA の最小権限（firebase-tools 15.35.0 のソースに基づく）

`firebase deploy --only apphosting:<backend>` が行う API 呼び出しを
列挙して決めている。権限が足りない場合は該当行のコメントを参照。

| 権限 | 根拠（firebase-tools のコードパス） |
|---|---|
| `roles/firebaseapphosting.viewer`（プロジェクト） | `listBackends`（prepare.ts）、`listRollouts`/`listBuilds`（`getNextRolloutId`）、`getBackend`、LRO ポーリングの `operations.get`、`getProject`（projectNumber 解決）に必要な get/list 一式 |
| `roles/serviceusage.serviceUsageConsumer`（プロジェクト） | `ensureApiEnabled`/`ensureRequiredApisEnabled` の `serviceusage.services.get` と `x-goog-user-project` 用の `services.use` |
| カスタム `apphostingDeploySupport` = `storage.buckets.list`（プロジェクト） | `gcs.upsertBucket` が `listBuckets` で既存バケットを探すため |
| カスタム `apphostingRolloutCreator` = `firebaseapphosting.builds.create` + `firebaseapphosting.rollouts.create`（条件付き） | `orchestrateRollout` の `createBuild` / `createRollout`（validateOnly 含む）。条件 `resource.type == 'firebaseapphosting.googleapis.com/Backend' && resource.name.endsWith('/backends/<id>')` で対象バックエンドに限定 |
| `roles/storage.objectCreator`（ソースバケット単位） | `uploadArchive` が XML API `PUT /<bucket>/<object>` で zip をアップロードするため |
| `roles/iam.serviceAccountUser`（`firebase-app-hosting-compute` SA） | `verifyRuntimeServiceAccountAccess` が `iam.serviceAccounts.actAs` を `testIamPermissions` で確認するため必須 |
| `roles/iam.serviceAccountUser`（対応環境のランタイム SA） | backend.serviceAccount は作成済みで厳密には不要の可能性があるが、防御として付与 |
| `roles/iam.workloadIdentityUser`（デプロイ SA 自身） | WIF プールからのなりすまし用。`attribute.environment/<env>` 限定 |

- `firebase-app-hosting-compute@<project>.iam.gserviceaccount.com` は
  firebase-tools 固定名のビルドパイプライン SA で、環境共有。初回デプロイ
  前に存在しないとロールアウトのビルドが失敗し得るため bootstrap で
  作成し、`provisionDefaultComputeServiceAccount` と同じ 4 ロール
  （`firebaseapphosting.computeRunner` / `firebase.sdkAdminServiceAgent` /
  `developerconnect.readTokenAccessor` / `storage.objectViewer`）を付与する。
  この SA の `storage.objectViewer`（プロジェクト）がソース zip の
  読み取りを担う。
- `provisionDefaultComputeServiceAccount` 内の `addServiceAccountToRoles`
  は `resourcemanager.projects.setIamPolicy` が無くても警告のみで
  継続する（least-privilege でも致命的ではない設計）。ただし既に
  付与済みの前提にしている。
- 条件付きバインドが firebaseapphosting API で評価されない場合は、
  条件なしのプロジェクト単位付与に緩めることになる（その場合の環境境界は
  WIF プロバイダの `environment` 条件と GitHub environment 保護に依存）。
  初回デプロイ時に `builds.create` / `rollouts.create` が権限不足で失敗
  しないか確認すること。

### セットアップ手順

```bash
bash scripts/bootstrap-github-deploy.sh
```

プロジェクトのオーナー相当 + リポジトリ admin 相当のアカウントで実行する
冪等スクリプト。詳細はスクリプト先頭のコメント参照。

### 一時停止（pause switch）

- リポジトリ変数 `DEPLOY_STG_PAUSED` / `DEPLOY_PROD_PAUSED` を `true` に
  すると対応するデプロイジョブが `if` でスキップされる。
- GitHub UI から対象 workflow を disable にしてもよい。

### 既知の制限・注意

- **クレジット自動停止は未設定**。予算 $20 に対し Cloud Build は PR push
  ごとに走るため、頻繁な push で課金が膨らみ得る。ビルド時間が長い場合は
  `DEPLOY_*_PAUSED` で止めるか、`minInstances: 0` を維持する。
- `firebase deploy` は `--force` で「バックエンドが無いと警告してスキップ」
  する経路がある。ワークフローはデプロイ前にバックエンドの存在と
  `environment` 値を確認し、デプロイ後に最新ロールアウトが
  `state == SUCCEEDED` かつジョブ開始以降の作成であることを検証する。
- CLI はロールアウトを完了までポーリングする（masterTimeout 60 分）。
  途中でジョブがキャンセルされてもクラウド側ロールアウトは続行するため、
  上記の待機 + 検証で順序と結果を担保している。実行中ロールアウトの
  キャンセル（`firebaseapphosting.operations.cancel`）は権限を付けていない。
  詰まったロールアウトはコンソールで対処する。
- 同日中の連続ロールアウト ID（`build-YYYY-MM-DD-NNN`）は並列実行時に
  衝突し得る。直列化しているため通常は起きないが、発生したらリトライ。
- ロールバックは App Hosting のロールアウト単位。古いコミットを再デプロイ
  するには該当 CI run のデプロイを re-run するか、ローカルから
  `firebase deploy --only apphosting:<backend>` を実行する。
- App Hosting バックエンド自体に IAM ポリシー（setIamPolicy）は存在せず、
  バックエンド単位の制御は条件付きプロジェクトバインドで代替している。
