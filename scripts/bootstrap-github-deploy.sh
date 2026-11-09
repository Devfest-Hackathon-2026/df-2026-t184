#!/usr/bin/env bash
# Reviewed bootstrap for repository/workflow-scoped OIDC. No long-lived keys.
# Does not deploy. Starts paused; reruns preserve pause switches.

set -euo pipefail
if [ "${1:-}" != "--apply" ]; then
  echo 'Review this script, then run: bash scripts/bootstrap-github-deploy.sh --apply'
  exit 0
fi
gcloud() { command gcloud --quiet --account=yamadamei0512@gmail.com --billing-project=df-2026-t184-prod "$@"; }

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
provider_condition() {
  case "$1" in
    stg)  echo "assertion.repository_owner_id == '${GITHUB_OWNER_ID}' && assertion.repository_id == '${GITHUB_REPO_ID}' && assertion.event_name == 'workflow_run' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '${GITHUB_REPO}/.github/workflows/deploy-stg.yml@refs/heads/main'";;
    prod) echo "assertion.repository_owner_id == '${GITHUB_OWNER_ID}' && assertion.repository_id == '${GITHUB_REPO_ID}' && assertion.event_name == 'workflow_run' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '${GITHUB_REPO}/.github/workflows/deploy-prod.yml@refs/heads/main'";;
    *) return 1;;
  esac
}

GCLOUD=(gcloud --project "${PROJECT_ID}")
ENVS="stg prod"

log() { printf '\n=== %s ===\n' "$*"; }

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
    --member "serviceAccount:${COMPUTE_SA}" --role "${role}" --condition=None >/dev/null
done

log "deploy service accounts"
for env in ${ENVS}; do
  if ! gcloud iam service-accounts describe "$(deploy_sa "${env}")" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    "${GCLOUD[@]}" iam service-accounts create "github-deploy-${env}" \
      --display-name "GitHub Actions deploy (${env})"
  fi
done

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
gcloud storage buckets update "gs://${SOURCE_BUCKET}" \
  --update-labels "apphosting-source-${REGION}=true"

for env in ${ENVS}; do
  gcloud storage buckets add-iam-policy-binding "gs://${SOURCE_BUCKET}" \
    --member "serviceAccount:$(deploy_sa "${env}")" \
    --role roles/storage.objectCreator >/dev/null
done

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

log "project IAM for deploy SAs"
for env in ${ENVS}; do
  member="serviceAccount:$(deploy_sa "${env}")"
  for role in \
    roles/firebaseapphosting.viewer \
    roles/serviceusage.serviceUsageConsumer \
    "projects/${PROJECT_ID}/roles/${SUPPORT_ROLE_ID}"; do
    "${GCLOUD[@]}" projects add-iam-policy-binding "${PROJECT_ID}" \
      --member "${member}" --role "${role}" --condition=None >/dev/null
  done

  cond_expr="resource.type == 'firebaseapphosting.googleapis.com/Backend' && resource.name.endsWith('/backends/$(backend_id "${env}")')"
  "${GCLOUD[@]}" projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "${member}" \
    --role "projects/${PROJECT_ID}/roles/${ROLLOUT_ROLE_ID}" \
    --condition="title=rollout-$(backend_id "${env}"),expression=${cond_expr}" >/dev/null
done

log "service account IAM"
for env in ${ENVS}; do
  "${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "${COMPUTE_SA}" \
    --member "serviceAccount:$(deploy_sa "${env}")" \
    --role roles/iam.serviceAccountUser >/dev/null
  "${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "$(runtime_sa "${env}")" \
    --member "serviceAccount:$(deploy_sa "${env}")" \
    --role roles/iam.serviceAccountUser >/dev/null
done

log "workload identity pool + providers"
if ! "${GCLOUD[@]}" iam workload-identity-pools describe "${POOL_ID}" \
    --location global >/dev/null 2>&1; then
  "${GCLOUD[@]}" iam workload-identity-pools create "${POOL_ID}" \
    --location global --display-name "GitHub Actions"
fi

ATTR_MAPPING="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.event_name=assertion.event_name,attribute.actor_id=assertion.actor_id,attribute.workflow_ref=assertion.workflow_ref"

for env in ${ENVS}; do
  if "${GCLOUD[@]}" iam workload-identity-pools providers describe "$(provider_id "${env}")" \
      --location global --workload-identity-pool "${POOL_ID}" >/dev/null 2>&1; then
    "${GCLOUD[@]}" iam workload-identity-pools providers update-oidc "$(provider_id "${env}")" \
      --location global --workload-identity-pool "${POOL_ID}" \
      --display-name "GitHub Actions (${env})" \
      --attribute-mapping "${ATTR_MAPPING},attribute.deploy_environment='${env}'" \
      --attribute-condition "$(provider_condition "${env}")"
  else
    "${GCLOUD[@]}" iam workload-identity-pools providers create-oidc "$(provider_id "${env}")" \
      --location global --workload-identity-pool "${POOL_ID}" \
      --display-name "GitHub Actions (${env})" \
      --issuer-uri "https://token.actions.githubusercontent.com" \
      --attribute-mapping "${ATTR_MAPPING},attribute.deploy_environment='${env}'" \
      --attribute-condition "$(provider_condition "${env}")"
  fi

  "${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "$(deploy_sa "${env}")" \
    --role roles/iam.workloadIdentityUser \
    --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.deploy_environment/${env}" \
    >/dev/null
done

log "github variables"
for env in ${ENVS}; do
  upper=$(echo "${env}" | tr '[:lower:]' '[:upper:]')
  gh variable set "GCP_WIF_PROVIDER_${upper}" --repo "${GITHUB_REPO}" --body "$(provider_resource "${env}")"
  gh variable set "GCP_DEPLOY_SA_${upper}" --repo "${GITHUB_REPO}" --body "$(deploy_sa "${env}")"
  if ! gh variable get "$(pause_var "${env}")" --repo "${GITHUB_REPO}" >/dev/null 2>&1; then
    gh variable set "$(pause_var "${env}")" --repo "${GITHUB_REPO}" --body true
  fi
done

cat <<'EOF'

=== done ===
ワークフローは両方とも main にマージされて初めて有効になる
(workflow_run はデフォルトブランチ上のワークフロー定義のみを使う)。
初回デプロイまでに上記のリソース作成が伝播するよう数分待つこと。
EOF
