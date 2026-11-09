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
| prod | 最新mainのpush CI成功 | yorimichi-prod |

`workflow_run`でmainのワークフローを実行する。同名の別CIを拾わないようパスも確認する。
fork・閉じたPR・古いSHA・`.github/`を変更するPRはstgへ自動デプロイしない。
`.github/`を変更するPRはレビュー後にmainへ取り込み、別のアプリ変更PRで確認する。

stgはPRごとのプレビューではなく共用。最後にデプロイされた内容が表示される。
両環境とも同時に1ジョブだけ実行し、実行中のジョブを新しいジョブでキャンセルしない。
GitHub concurrencyはFIFOを保証せず、待機中のジョブが置き換わる場合もあるため、
待機終了後にもPR/mainの最新SHAを照合する。mainの古いCI再実行で巻き戻さない。

### stg デプロイ結果の PR 本文への記録

デプロイと smoke check が成功すると、`report` ジョブが対象 PR の**本文**に
`<!-- STG_DEPLOY_STATUS -->` で囲まれたブロックを書き込む。内容は
stg URL、デプロイ SHA、ワークフロー実行リンク、記録日時、
Firestore `yorimichi-stg`（`df-2026-t184-prod`）へのコンソールリンクと
「共有 stg/DB は PR 専用ではなく他 PR で上書きされ得る」注記のみで、
認証情報や API キーは含まない。

- report ジョブは deploy ジョブの成功を前提に別ジョブとして動き、
  `pull-requests: write` だけを持つ（`id-token` なし、GCP 権限なし）。
- main 由来のスクリプト（`scripts/report-stg-deploy.py`）だけを実行し、
  PR ソースや成果物は一切使わない。
- PR が open・main 向け・同一リポジトリ・head SHA 不変でない場合は何も書かない。
  PATCH 直前に本文を再取得し、マーカー外は一切変更しない。
  ブロックは冪等（内容が同じなら PATCH しない）。マーカーが壊れている
  （片方だけ・逆順・複数）場合は fail closed で更新を拒否する。
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
builds.create/rollouts.createはバックエンド名条件付きで付与する。
**条件付き権限の実API評価は初回デプロイで検証する。失敗時に無条件の権限へ自動変更しない。**
CLI既定compute SAの4ロールはfirebase-toolsのprovision処理に合わせている。

根拠: [firebase-tools 15.35.0](https://github.com/firebase/firebase-tools/tree/v15.35.0/src/deploy/apphosting)、
[CLIのバックエンド準備](https://github.com/firebase/firebase-tools/blob/v15.35.0/src/apphosting/backend.ts)、
[認証Actionの公式inputs](https://github.com/google-github-actions/auth/blob/v3/action.yml)、
[App Hostingのソースデプロイ](https://firebase.google.com/docs/app-hosting/alt-deploy)。

初回bootstrapは`DEPLOY_STG_PAUSED` / `DEPLOY_PROD_PAUSED`を`true`で作る。
再実行時には既存値を維持する。レビュー・接続確認後、各値を`false`にして有効化する。
この停止スイッチは新しいデプロイだけを止める。稼働中サービスや課金は止まらない。

### 検証と運用上の制限

`python3 scripts/test-deploy.py`で古いSHA・閉じたPR・fork・workflow変更・
不正なデプロイ設定・シンボリックリンクの拒否を検証する。
ワークフローは既存ロールアウト完了待ち、CLI実行、作成日時と成功状態の確認、HTTP確認を行う。
外部から同時に手動デプロイしないこと。ジョブを手動キャンセルしてもクラウド側の処理は残る。

OIDCの実トークン交換とビルド・公開はmainへの取り込み後に検証する。
ロールバックはmainにrevertを入れてCIを通す。古いCIの再実行は古いSHAとして拒否される。
クレジット終了時の自動停止は未設定。PR更新のたびにビルド費用が発生し得る。
