#!/usr/bin/env bash
# Reproduce and verify the atomic branch-delete lease used by
# delete-merged-branch.yml, against a local bare remote. Runs in CI.
#
#   1. lease delete with the correct expected SHA removes the branch
#   2. a competing push landing after our ls-remote snapshot is NOT lost:
#      the stale-lease delete is rejected and the ref survives
#   3. a deleted branch is a no-op, protected names are refused
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
root=$(mktemp -d "${TMPDIR:-/tmp}/branch-delete-test.XXXXXX")
trap 'rm -rf "${root}"' EXIT
cd "${root}"

export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com
export GH_TOKEN=unused-for-file-remote

git init --bare remote.git >/dev/null
git init work >/dev/null
cd work
git commit --allow-empty -m init >/dev/null
git remote add origin "${root}/remote.git"
git push -q origin HEAD:refs/heads/main
git checkout -qb feat/x
git commit --allow-empty -m feature >/dev/null
git push -q origin feat/x
sha=$(git rev-parse HEAD)
remote="file://${root}/remote.git"

delete() {
  BRANCH="$1" EXPECTED_SHA="$2" REMOTE_URL="${remote}" \
    bash "${SCRIPT_DIR}/delete-merged-branch.sh"
}
ref() { git --git-dir="${root}/remote.git" rev-parse --verify --quiet "refs/heads/$1" || true; }

# 1. Happy path: delete removes the branch.
out=$(delete feat/x "${sha}")
echo "${out}"
grep -q 'Deleted merged branch' <<<"${out}"
[ -z "$(ref feat/x)" ] || { echo "FAIL: feat/x still exists"; exit 1; }

# 2. Race: a push lands after our expected SHA was taken. The lease must be
#    rejected and the new commit must survive.
git push -q origin HEAD:refs/heads/feat/y
old=$(git rev-parse HEAD)
git commit --allow-empty -m raced >/dev/null
git push -q origin HEAD:refs/heads/feat/y
new=$(git rev-parse HEAD)
out=$(delete feat/y "${old}" || true)
echo "${out}"
# Stale expected SHA never reaches the push: skipped up front.
[ "$(ref feat/y)" = "${new}" ] || { echo "FAIL: raced commit was deleted"; exit 1; }
# And the lease itself must refuse even if ls-remote raced: delete directly
# with a stale expectation against the same remote.
if git push --force-with-lease="refs/heads/feat/y:${old}" "${remote}" ":refs/heads/feat/y" 2>/dev/null; then
  echo "FAIL: stale lease delete was accepted"
  exit 1
fi
[ "$(ref feat/y)" = "${new}" ] || { echo "FAIL: lease delete removed raced ref"; exit 1; }

# 3. Missing ref is a no-op; protected names are skipped, weird names fail.
delete feat/absent "${sha}" | grep -q 'already absent' || { echo "FAIL: absent ref"; exit 1; }
delete main "${sha}" | grep -q 'skipped' || { echo "FAIL: main not skipped"; exit 1; }
delete release/1.0 "${sha}" | grep -q 'skipped' || { echo "FAIL: release not skipped"; exit 1; }
if delete '../evil' "${sha}" 2>/dev/null; then
  echo "FAIL: traversal branch accepted"; exit 1
fi
if delete '-u' "${sha}" 2>/dev/null; then
  echo "FAIL: option-lookalike accepted"; exit 1
fi

echo "branch delete lease tests passed"
