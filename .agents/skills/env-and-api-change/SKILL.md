---
name: env-and-api-change
description: このPJ（df-2026-t184）で Google の API・API キー・環境変数・Secret Manager の秘密情報を追加または変更するときの手順。stg と prod の両方に漏れなく設定するために使う。他リポジトリへの適用は想定しない。
---

# Google API・環境変数・秘密情報の追加と変更

stg と prod は同じ GCP プロジェクト `df-2026-t184-prod` にある。API の有効化は両環境で共通になる。一方、API キー・Secret・ランタイム SA は環境ごとに分かれている。片方の環境だけ設定すると、もう片方では動かない。

例: Routes API を使う PR #14 では、prod の Maps キーは Routes API を許可していたが、stg のキーは許可していなかった。stg のキーは `localhost:3000` も許可しているため、ローカル開発でも経路が取れなくなる。

## 前提

- この変更は AGENTS.md の「レビュー必須条件（要相談PR）」に当たる。PR で相談し、承認を受けてからマージする
- クラウドへの変更（API の有効化、キーの制限、Secret の作成、IAM）は、PM（山田）の承認を得てから行う。承認前のエージェントは、読み取りと実行するコマンドの提案までにとどめる
- 現在の構成は [docs/environments.md](../../../docs/environments.md) を正とする

## 1. 何を変えるか決める

| 変えるもの | 触る場所 |
|---|---|
| ブラウザから呼ぶ Maps 系 API | API の有効化と、`yorimichi-stg-maps`・`yorimichi-prod-maps` の API 制限 |
| サーバーから呼ぶ Gemini 系 API | API の有効化と、`yorimichi-stg-gemini`・`yorimichi-prod-gemini` の API 制限 |
| 秘密でない環境変数 | `apphosting.stg.yaml`・`apphosting.prod.yaml` の `value`、`.env.example` |
| 秘密の環境変数 | Secret `STG_<NAME>`・`PROD_<NAME>`、両 YAML の `secret` 参照、`.env.example`（値は空） |

Secret の名前はプロジェクト内で重複できないため、`STG_` と `PROD_` を前に付ける。アプリが読む変数名は両環境で同じにする。

## 2. 今の設定を確かめる（読み取りのみ）

以降のコマンドは、先にプロジェクト ID をシェル変数に入れてから実行する。

```bash
PROJECT=df-2026-t184-prod
gcloud services list --enabled --project="$PROJECT"
gcloud services api-keys list --project="$PROJECT" \
  --format="yaml(name.basename(),displayName,restrictions)"
gcloud secrets list --project="$PROJECT"
```

## 3. 両環境に設定する（承認後）

API を有効にする（両環境に効く）:

```bash
gcloud services enable <service>.googleapis.com --project="$PROJECT"
```

キーの API 制限を、stg と prod の両方で更新する。指定した一覧で置き換わるため、既存のターゲットもすべて並べる:

```bash
gcloud services api-keys update <KEY_ID> --project="$PROJECT" \
  --api-target=service=<既存のサービス> \
  --api-target=service=<追加するサービス>
```

Secret を作り、同じ環境のランタイム SA だけに読み取り権限を付ける。stg の SA に `PROD_*` を読ませない:

```bash
printf '%s' "$VALUE" | gcloud secrets create STG_<NAME> --data-file=- --project="$PROJECT"
gcloud secrets add-iam-policy-binding STG_<NAME> --project="$PROJECT" \
  --member=serviceAccount:yorimichi-stg@df-2026-t184-prod.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
# App Hostingのビルドではバージョン情報の取得も必要（RUNTIME専用secretも対象）。
gcloud secrets add-iam-policy-binding STG_<NAME> --project="$PROJECT" \
  --member=serviceAccount:yorimichi-stg@df-2026-t184-prod.iam.gserviceaccount.com \
  --role=roles/secretmanager.viewer
# PROD_<NAME> は yorimichi-prod@... に対して同じ操作をする
```

秘密の値はコマンドの出力やログ、PR に書かない。

## 4. リポジトリを更新する

- `apphosting.stg.yaml` と `apphosting.prod.yaml` に同じ変数名で追加する。`apphosting.yaml` には環境ごとに違う値を書かない
- `availability` は、`NEXT_PUBLIC_` で始まる変数なら `BUILD` と `RUNTIME`、それ以外は `RUNTIME` にする。`NEXT_PUBLIC_` の値はビルド時にバンドルへ埋め込まれる
- `.env.example` に変数を追加する。値は空にし、どこから値を取るかをコメントで書く
- `docs/environments.md` の Secret の表とキー制限の記述を更新する

## 5. 確認して PR に書く

- 両方のキーを `gcloud services api-keys describe <KEY_ID>` で見て、追加したサービスが入っていることを確かめる
- `gcloud secrets get-iam-policy <SECRET>` で、各 Secret を読めるのが同じ環境の SA だけであることを確かめる
- stg（またはローカル）で動作を確かめてから prod に反映する
- PR 本文に次を書く: 費用がかかる呼び出しと 1 画面あたりの回数、stg と prod それぞれの設定状況、確認できていないこと
