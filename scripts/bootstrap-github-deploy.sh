#!/usr/bin/env bash
# bootstrap-github-deploy.sh
#
# GitHub Actions -> Firebase App Hosting の CI/CD に必要な GCP / GitHub 側の
# 基盤を冪等に作成・更新するスクリプト。レビュー後にプロジェクトの
# オーナー / IAM 管理者権限を持つアカウントで実行すること。
#
#   bash scripts/bootstrap-github-deploy.sh
#
# 前提: gcloud / gh が対象アカウント・リポジトリで認証済みであること。
#   gcloud auth login  (プロジェクトのオーナー相当)
#   gh auth login      (リポジトリの admin 相当)
#
# このスクリプトが作るもの:
#   - firebase-app-hosting-compute SA (App Hosting ビルドパイプライン用、環境共有)
#   - github-deploy-stg / github-deploy-prod デプロイ SA (環境ごとに分離)
#   - ソースアップロード用 GCS バケット (CLI が upsert するものを先回りして作成)
#   - プロジェクトカスタムロール apphostingRolloutCreator / apphostingDeploySupport
#   - Workload Identity プール github-actions + プロバイダ github-stg / github-prod
#   - GitHub environments stg / prod (デプロイブランチを main に限定、
#     プラン制限で作れない場合は警告のみ) とリポジトリ変数
#     GCP_WIF_PROVIDER_* / GCP_DEPLOY_SA_* / DEPLOY_STG_PAUSED / DEPLOY_PROD_PAUSED
#
# 権限の根拠は firebase-tools のソースに基づく (docs/environments.md の
# 「CI/CD」節に出典を記載)。

set -euo pipefail

# ---------------------------------------------------------------------------
# 設定
# ---------------------------------------------------------------------------
PROJECT_ID="df-2026-t184-prod"
PROJECT_NUMBER="1031159186960"
REGION="asia-east1"

GITHUB_REPO="shun-os/df-2026-t184"
GITHUB_REPO_ID="1445609754"        # リポジトリの数値 ID (rename 耐性のため ID 指定)
GITHUB_OWNER_ID="148208196"        # owner の数値 ID

POOL_ID="github-actions"
COMPUTE_SA_ID="firebase-app-hosting-compute" # firebase-tools 固定名
SOURCE_BUCKET="firebaseapphosting-sources-${PROJECT_NUMBER}-${REGION}"

ROLLOUT_ROLE_ID="apphostingRolloutCreator"   # builds.create + rollouts.create
SUPPORT_ROLE_ID="apphostingDeploySupport"    # storage.buckets.list

COMPUTE_SA="${COMPUTE_SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

backend_id()  { case "$1" in stg) echo yorimichi-stg;; prod) echo yorimichi-prod;; *) return 1;; esac; }
deploy_sa()   { echo "github-deploy-$1@${PROJECT_ID}.iam.gserviceaccount.com"; }
runtime_sa()  { case "$1" in stg) echo "yorimichi-stg@${PROJECT_ID}.iam.gserviceaccount.com";;
                            prod) echo "yorimichi-prod@${PROJECT_ID}.iam.gserviceaccount.com";; *) return 1;; esac; }
pause_var()   { case "$1" in stg) echo DEPLOY_STG_PAUSED;; prod) echo DEPLOY_PROD_PAUSED;; *) return 1;; esac; }
provider_id() { echo "github-$1"; }
provider_resource() {
  echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/github-$1"
}
# GitHub OIDC トークンのクレーム条件。environment クレームはジョブが
# 対象 environment で実行されるときだけ付く。両環境とも deploy ワークフローは
# workflow_run 経由のみ (event_name を固定)、prod は ref も main に縛る。
provider_condition() {
  case "$1" in
    stg)  echo "assertion.repository_owner_id == '${GITHUB_OWNER_ID}' && assertion.repository_id == '${GITHUB_REPO_ID}' && assertion.event_name == 'workflow_run' && assertion.environment == 'stg'";;
    prod) echo "assertion.repository_owner_id == '${GITHUB_OWNER_ID}' && assertion.repository_id == '${GITHUB_REPO_ID}' && assertion.event_name == 'workflow_run' && assertion.environment == 'prod' && assertion.ref == 'refs/heads/main'";;
    *) return 1;;
  esac
}

GCLOUD=(gcloud --project "${PROJECT_ID}")
ENVS="stg prod"

log() { printf '\n=== %s ===\n' "$*"; }

# ---------------------------------------------------------------------------
# 1. 必要な API を有効化
# ---------------------------------------------------------------------------
log "API enablement"
"${GCLOUD[@]}" services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  storage.googleapis.com \
  firebaseapphosting.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  developerconnect.googleapis.com

# ---------------------------------------------------------------------------
# 2. App Hosting コンピュート SA (firebase-tools がデプロイ時に参照し、
#    iam.serviceAccounts.actAs を要求するビルドパイプライン ID)。
#    ロールは CLI の provisionDefaultComputeServiceAccount と同じ組。
# ---------------------------------------------------------------------------
log "App Hosting compute service account"
if ! gcloud iam service-accounts describe "${COMPUTE_SA}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  "${GCLOUD[@]}" iam service-accounts create "${COMPUTE_SA_ID}" \
    --display-name "Default service account used to run builds and deploys for Firebase App Hosting"
fi
for role in \
  roles/firebaseapphosting.computeRunner \
  roles/firebase.sdkAdminServiceAgent \
  roles/developerconnect.readTokenAccessor \
  roles/storage.objectViewer; do
  "${GCLOUD[@]}" projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${COMPUTE_SA}" --role "${role}" >/dev/null
done

# ---------------------------------------------------------------------------
# 3. 環境ごとのデプロイ SA
# ---------------------------------------------------------------------------
log "deploy service accounts"
for env in ${ENVS}; do
  if ! gcloud iam service-accounts describe "$(deploy_sa "${env}")" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    "${GCLOUD[@]}" iam service-accounts create "github-deploy-${env}" \
      --display-name "GitHub Actions deploy (${env})"
  fi
done

# ---------------------------------------------------------------------------
# 4. ソースアップロード用 GCS バケット
#    firebase-tools は upsertBucket() で purpose ラベル
#    "apphosting-source-<region>" を持つバケットを探し、無ければ作成する。
#    先回りして同名・同ラベル・同ライフサイクルで作り、デプロイ SA には
#    バケット作成権限を与えない構成にする。
# ---------------------------------------------------------------------------
log "source upload bucket"
if ! gcloud storage buckets describe "gs://${SOURCE_BUCKET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  lifecycle_json=$(mktemp /tmp/apphosting-lifecycle.XXXXXX.json)
  cat > "${lifecycle_json}" <<'JSON'
{ "rule": [ { "action": { "type": "Delete" }, "condition": { "age": 30 } } ] }
JSON
  gcloud storage buckets create "gs://${SOURCE_BUCKET}" \
    --project "${PROJECT_ID}" \
    --location "${REGION}" \
    --uniform-bucket-level-access \
    --lifecycle-file "${lifecycle_json}"
  rm -f "${lifecycle_json}"
fi
# CLI が managed bucket と判定するための purpose ラベル (必須)
gcloud storage buckets update "gs://${SOURCE_BUCKET}" \
  --update-labels "apphosting-source-${REGION}=true"

# バケット単位でデプロイ SA にオブジェクト作成権限 (ソース zip の PUT 用)
for env in ${ENVS}; do
  gcloud storage buckets add-iam-policy-binding "gs://${SOURCE_BUCKET}" \
    --member "serviceAccount:$(deploy_sa "${env}")" \
    --role roles/storage.objectCreator >/dev/null
done

# ---------------------------------------------------------------------------
# 5. プロジェクトカスタムロール
# ---------------------------------------------------------------------------
log "custom roles"
if gcloud iam roles describe "${ROLLOUT_ROLE_ID}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam roles update "${ROLLOUT_ROLE_ID}" --project "${PROJECT_ID}" \
    --title "App Hosting rollout creator" --stage GA \
    --permissions "firebaseapphosting.builds.create,firebaseapphosting.rollouts.create" >/dev/null
else
  gcloud iam roles create "${ROLLOUT_ROLE_ID}" --project "${PROJECT_ID}" \
    --title "App Hosting rollout creator" --stage GA \
    --permissions "firebaseapphosting.builds.create,firebaseapphosting.rollouts.create" >/dev/null
fi

if gcloud iam roles describe "${SUPPORT_ROLE_ID}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam roles update "${SUPPORT_ROLE_ID}" --project "${PROJECT_ID}" \
    --title "App Hosting deploy support" --stage GA \
    --permissions "storage.buckets.list" >/dev/null
else
  gcloud iam roles create "${SUPPORT_ROLE_ID}" --project "${PROJECT_ID}" \
    --title "App Hosting deploy support" --stage GA \
    --permissions "storage.buckets.list" >/dev/null
fi

# ---------------------------------------------------------------------------
# 6. デプロイ SA へのプロジェクト IAM
#    - firebaseapphosting.viewer : backends/builds/rollouts/operations の
#      get/list + resourcemanager.projects.get (read 系は無条件)
#    - serviceusage.serviceUsageConsumer : CLI の API 有効化チェック
#      (services.get) と x-goog-user-project のクォータ権限 (services.use)
#    - apphostingDeploySupport : storage.buckets.list
#    - apphostingRolloutCreator : 対象バックエンド限定の条件付きバインド
#      (stg の SA は prod バックエンドに rollout を作れない)
# ---------------------------------------------------------------------------
log "project IAM for deploy SAs"
for env in ${ENVS}; do
  member="serviceAccount:$(deploy_sa "${env}")"
  for role in \
    roles/firebaseapphosting.viewer \
    roles/serviceusage.serviceUsageConsumer \
    "projects/${PROJECT_ID}/roles/${SUPPORT_ROLE_ID}"; do
    "${GCLOUD[@]}" projects add-iam-policy-binding "${PROJECT_ID}" \
      --member "${member}" --role "${role}" >/dev/null
  done

  # バックエンド限定の条件付きバインド (同一 title+expression で再適用)
  cond_expr="resource.type == 'firebaseapphosting.googleapis.com/Backend' && resource.name.endsWith('/backends/$(backend_id "${env}")')"
  "${GCLOUD[@]}" projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "${member}" \
    --role "projects/${PROJECT_ID}/roles/${ROLLOUT_ROLE_ID}" \
    --condition="title=rollout-$(backend_id "${env}"),expression=${cond_expr}" >/dev/null
done

# ---------------------------------------------------------------------------
# 7. SA リソース単位の IAM
#    - コンピュート SA : 両デプロイ SA に serviceAccountUser
#      (CLI がデプロイ前に iam.serviceAccounts.actAs をテストするため必須)
#    - ランタイム SA : 対応環境のデプロイ SA に serviceAccountUser
#      (backend.serviceAccount は作成済みだが防御として付与)
# ---------------------------------------------------------------------------
log "service account IAM"
for env in ${ENVS}; do
  "${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "${COMPUTE_SA}" \
    --member "serviceAccount:$(deploy_sa "${env}")" \
    --role roles/iam.serviceAccountUser >/dev/null
  "${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "$(runtime_sa "${env}")" \
    --member "serviceAccount:$(deploy_sa "${env}")" \
    --role roles/iam.serviceAccountUser >/dev/null
done

# ---------------------------------------------------------------------------
# 8. Workload Identity プール + GitHub OIDC プロバイダ
#    プロバイダを環境ごとに分け、attribute_condition で
#    リポジトリ数値 ID / environment クレーム / (prod は) ref を縛る。
#    長寿命キーは発行しない。
# ---------------------------------------------------------------------------
log "workload identity pool + providers"
if ! "${GCLOUD[@]}" iam workload-identity-pools describe "${POOL_ID}" \
    --location global >/dev/null 2>&1; then
  "${GCLOUD[@]}" iam workload-identity-pools create "${POOL_ID}" \
    --location global --display-name "GitHub Actions"
fi

ATTR_MAPPING="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.environment=assertion.environment,attribute.ref=assertion.ref,attribute.event_name=assertion.event_name,attribute.actor_id=assertion.actor_id,attribute.workflow_ref=assertion.workflow_ref"

for env in ${ENVS}; do
  if "${GCLOUD[@]}" iam workload-identity-pools providers describe "$(provider_id "${env}")" \
      --location global --workload-identity-pool "${POOL_ID}" >/dev/null 2>&1; then
    "${GCLOUD[@]}" iam workload-identity-pools providers update-oidc "$(provider_id "${env}")" \
      --location global --workload-identity-pool "${POOL_ID}" \
      --display-name "GitHub Actions (${env})" \
      --attribute-mapping "${ATTR_MAPPING}" \
      --attribute-condition "$(provider_condition "${env}")"
  else
    "${GCLOUD[@]}" iam workload-identity-pools providers create-oidc "$(provider_id "${env}")" \
      --location global --workload-identity-pool "${POOL_ID}" \
      --display-name "GitHub Actions (${env})" \
      --issuer-uri "https://token.actions.githubusercontent.com" \
      --attribute-mapping "${ATTR_MAPPING}" \
      --attribute-condition "$(provider_condition "${env}")"
  fi

  # 対応するデプロイ SA へのなりすましを environment 属性で縛る
  "${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "$(deploy_sa "${env}")" \
    --role roles/iam.workloadIdentityUser \
    --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.environment/${env}" \
    >/dev/null
done

# ---------------------------------------------------------------------------
# 9. GitHub 側設定
#    - リポジトリ変数 GCP_WIF_PROVIDER_* / GCP_DEPLOY_SA_* (ワークフロー参照)
#    - リポジトリ変数 DEPLOY_*_PAUSED=false (pause switch)
#    - environments stg / prod : デプロイ可能ブランチを main に限定
#      (workflow_run 実行はデフォルトブランチ ref で走るため問題なく動く)
#
#    注意: GitHub environments は private リポジトリでは Pro プラン以上が
#    必要。作成に失敗した場合は警告を出して続行する。その場合の影響:
#      - ブランチ保護は効かない (WIF プロバイダの environment/ref 条件と
#        workflow_run 構成が残る防御)
#      - ジョブの `environment:` 宣言が無視されると environment クレームが
#        付かず WIF の条件評価に失敗し得る。その場合はワークフローから
#        `environment:` を外し、プロバイダ条件と workloadIdentityUser
#        バインドを attribute.job_workflow_ref ベースに切り替える
# ---------------------------------------------------------------------------
log "github variables"
for env in ${ENVS}; do
  upper=$(echo "${env}" | tr '[:lower:]' '[:upper:]')
  gh variable set "GCP_WIF_PROVIDER_${upper}" --body "$(provider_resource "${env}")"
  gh variable set "GCP_DEPLOY_SA_${upper}" --body "$(deploy_sa "${env}")"
  gh variable set "$(pause_var "${env}")" --body false
done

log "github environments"
for env in ${ENVS}; do
  if ! gh api -X PUT "repos/${GITHUB_REPO}/environments/${env}" --input - >/dev/null 2>&1 <<'JSON'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
  then
    echo "WARN: environment ${env} を作成/更新できません (private repo + プラン制限の可能性)。続行します。" >&2
    continue
  fi
  # main ブランチのみを許可 (既存ポリシーがあれば再作成しない)
  policy_id=$(gh api "repos/${GITHUB_REPO}/environments/${env}/deployment-branch-policies" \
    --jq '.branch_policies[]? | select(.name == "main") | .id' || true)
  if [ -z "${policy_id}" ]; then
    gh api -X POST "repos/${GITHUB_REPO}/environments/${env}/deployment-branch-policies" \
      -f name=main >/dev/null
  fi
done

cat <<'EOF'

=== done ===
ワークフローは両方とも main にマージされて初めて有効になる
(workflow_run はデフォルトブランチ上のワークフロー定義のみを使う)。
初回デプロイまでに上記のリソース作成が伝播するよう数分待つこと。
EOF
