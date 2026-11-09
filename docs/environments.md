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
- `local` のFirebase利用は `NEXT_PUBLIC_FIREBASE_EMULATOR=true` が必須。DB ID省略時はエミュレータの `(default)` を使い、実環境のDB名は拒否する。
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
  firebase emulators:start --project demo-yorimichi
  ```
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
