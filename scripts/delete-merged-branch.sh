#!/usr/bin/env bash
# Atomically delete a merged PR's remote branch via a git push lease.
#
# The GitHub getRef -> deleteRef sequence is a TOCTOU: a push landing between
# the read and the delete would be silently destroyed. Instead we send the
# deletion with --force-with-lease=<ref>:<expected>, so the server rejects the
# update when the remote ref moved past the merged head. Verified against a
# local bare remote by scripts/test-branch-delete.sh (runs in CI).
#
# Inputs (env): BRANCH, EXPECTED_SHA, REMOTE_URL.
#   GH_TOKEN is read only by GIT_ASKPASS when the remote asks for a password;
#   it never appears in the URL, argv, or logs.
set -euo pipefail

branch="${BRANCH:?}" expected="${EXPECTED_SHA:?}" remote="${REMOTE_URL:?}"

# Branch name allowlist: refuse option-lookalikes, traversal, ref syntax, and
# long-lived/default names. The workflow also checks base/default/open-PR use.
case "${branch}" in
  -*|/*|*/|.*|*.|*..*|*//*|*@\{*|*.lock|*[!A-Za-z0-9._/-]*)
    echo "::error::refusing unusual branch name: ${branch}"
    exit 1 ;;
esac
lower=$(printf '%s' "${branch}" | tr '[:upper:]' '[:lower:]')
case "${lower}" in
  main|master|develop|development|staging|stg|prod|production|gh-pages|trunk|release|releases|release/*|releases/*|hotfix/*)
    echo "Protected/long-lived branch name '${branch}'; skipped"
    exit 0 ;;
esac
if [[ ! "${expected}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::EXPECTED_SHA is not a lowercase commit SHA: ${expected}"
  exit 1
fi

askpass=$(mktemp "${TMPDIR:-/tmp}/git-askpass.XXXXXX")
trap 'rm -f "${askpass}"' EXIT
cat > "${askpass}" <<'EOF'
#!/bin/sh
case "$1" in
  *sername*) printf '%s\n' x-access-token ;;
  *)         printf '%s\n' "${GH_TOKEN:-}" ;;
esac
EOF
chmod 700 "${askpass}"

remote_sha=$(GIT_ASKPASS="${askpass}" GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper= ls-remote "${remote}" "refs/heads/${branch}" \
  | awk '{print $1}')
if [ -z "${remote_sha}" ]; then
  echo "Branch ${branch} already absent; nothing to do"
  exit 0
fi
if [ "${remote_sha}" != "${expected}" ]; then
  echo "Branch ${branch} is at ${remote_sha}, not the merged ${expected}; skipped"
  exit 0
fi

if GIT_ASKPASS="${askpass}" GIT_TERMINAL_PROMPT=0 \
    git -c credential.helper= push \
    --force-with-lease="refs/heads/${branch}:${expected}" \
    "${remote}" ":refs/heads/${branch}"; then
  echo "Deleted merged branch: ${branch}"
  exit 0
fi

# A lost lease race means a new push won between ls-remote and push: the
# branch must survive, so re-read instead of treating it as an error.
now=$(GIT_ASKPASS="${askpass}" GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper= ls-remote "${remote}" "refs/heads/${branch}" \
  | awk '{print $1}')
if [ -z "${now}" ]; then
  echo "Deleted merged branch: ${branch}"
elif [ "${now}" != "${expected}" ]; then
  echo "Branch ${branch} raced to ${now}; skipped"
else
  echo "::error::lease delete failed while ref still at ${now}"
  exit 1
fi
