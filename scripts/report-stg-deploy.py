"""Record a successful shared-stg deploy in the PR body, inside fixed markers.

Runs in the report job of deploy-stg.yml against the trusted main checkout.
PATCHes the PR body only when the PR is still eligible and the block changed.
"""
import datetime
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

MARK_BEGIN = '<!-- STG_DEPLOY_STATUS -->'
MARK_END = '<!-- /STG_DEPLOY_STATUS -->'

PROJECT_ID = 'df-2026-t184-prod'
DATABASE_ID = 'yorimichi-stg'

_HOST_RE = re.compile(r'[a-z0-9][a-z0-9.-]*')
_SHA_RE = re.compile(r'[0-9a-f]{40}')


def build_block(uri, sha, run_url, repo_url, when):
    """The marker-delimited status block. Fixed, non-secret content only."""
    return (
        f'{MARK_BEGIN}\n'
        '### stg デプロイ\n\n'
        f'- URL: https://{uri}\n'
        f'- デプロイしたコミット: [`{sha[:7]}`]({repo_url}/commit/{sha})\n'
        f'- ワークフロー実行: {run_url}\n'
        f'- 記録日時 (UTC): {when}\n\n'
        f'stg は共有環境です。Firestore データベース `{DATABASE_ID}`'
        f'（プロジェクト `{PROJECT_ID}` /'
        ' [コンソール](https://console.firebase.google.com/project/'
        f'{PROJECT_ID}/firestore/databases/{DATABASE_ID}/data)）'
        'は全 PR で共用します。別の PR のデプロイにより、上記 URL で表示されるアプリが変わります。\n'
        f'{MARK_END}')


def upsert_block(body, block):
    """Replace the marker block, preserving everything outside it.

    No markers -> append. Exactly one begin/end pair in order -> replace.
    Anything else (unpaired, reversed, duplicated) -> refuse (fail closed).
    """
    body = body or ''
    nb, ne = body.count(MARK_BEGIN), body.count(MARK_END)
    if nb == 0 and ne == 0:
        if not body:
            sep = ''
        elif body.endswith('\n\n'):
            sep = ''
        elif body.endswith('\n'):
            sep = '\n'
        else:
            sep = '\n\n'
        return body + sep + block + '\n'
    if nb != 1 or ne != 1:
        raise ValueError('Malformed deploy markers in PR body; refusing to update')
    start, end = body.index(MARK_BEGIN), body.index(MARK_END)
    if end < start:
        raise ValueError('Malformed deploy markers in PR body; refusing to update')
    return body[:start] + block + body[end + len(MARK_END):]


def _eligible(event, current):
    mod_path = Path(__file__).with_name('check-deploy-candidate.py')
    spec = importlib.util.spec_from_file_location('check_deploy_candidate', mod_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # The deploy job already enforced the .github/ file gate; a changed head_sha
    # makes any new commit ineligible anyway, so no file listing is needed here.
    return mod.eligible(event, 'stg', current)


def planned_body(event, current, uri, run_url, repo_url, when):
    """New PR body to write, or None when the report must not touch the PR."""
    if not _eligible(event, current):
        return None
    body = current.get('body') or ''
    new = upsert_block(body, build_block(
        uri, event['workflow_run']['head_sha'], run_url, repo_url, when))
    return None if new == body else new


def api(path, *args):
    out = subprocess.check_output(['gh', 'api', path, *args], text=True)
    return json.loads(out)


def main():
    uri = os.environ['DEPLOYED_URI']
    if not _HOST_RE.fullmatch(uri):
        raise SystemExit(f'DEPLOYED_URI is not a plain hostname: {uri!r}')
    with open(os.environ['GITHUB_EVENT_PATH']) as f:
        event = json.load(f)
    run = event['workflow_run']
    if not _SHA_RE.fullmatch(run['head_sha']):
        raise SystemExit('workflow_run head_sha is not a full commit SHA')
    repo = event['repository']['full_name']
    repo_url = event['repository']['html_url']
    run_url = os.environ.get('DEPLOY_RUN_URL', '')
    when = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    failures = 0
    for pr in run.get('pull_requests', []):
        number = pr['number']
        # Fresh fetch doubles as the eligibility check and the body source
        # (never patch a body we did not just read).
        try:
            current = api(f'repos/{repo}/pulls/{number}')
            new = planned_body(event, current, uri, run_url, repo_url, when)
            if new is None:
                print(f'PR #{number}: not eligible or already current; skipped')
                continue
            api(f'repos/{repo}/pulls/{number}', '-X', 'PATCH', '-f', f'body={new}')
            print(f'PR #{number}: deploy block updated')
        except (ValueError, KeyError, subprocess.CalledProcessError) as e:
            failures += 1
            print(f'::error::PR #{number}: report failed ({e})')
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    main()
