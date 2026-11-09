"""Record a successful shared-stg deploy as a new dedicated PR comment.

Runs in the report job of deploy-stg.yml against the trusted main checkout.
Append-only: the script never edits the PR body or any existing comment, so
concurrent human edits can never be lost. A retried run skips posting when a
previous attempt already left a comment for the same workflow run (deduped by
marker + run URL on a github-actions[bot]-authored comment only; a marker in a
human-authored comment is never trusted).
"""
import datetime
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

MARK = '<!-- STG_DEPLOY_STATUS -->'
BOT_LOGIN = 'github-actions[bot]'

PROJECT_ID = 'df-2026-t184-prod'
DATABASE_ID = 'yorimichi-stg'

_HOST_RE = re.compile(r'[a-z0-9][a-z0-9.-]*')
_SHA_RE = re.compile(r'[0-9a-f]{40}')


def build_comment(uri, sha, run_url, repo_url, when):
    """The comment posted per deploy run. Fixed, non-secret content only."""
    return (
        f'{MARK}\n'
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
        'このコメントは投稿時点の履歴です。同じワークフロー実行の再投稿は行いません。'
        '最新のデプロイ状況はこのスレッドの新しいコメントを参照してください。')


def already_reported(comments, run_url):
    """True when a bot-authored deploy comment for this exact run exists.

    Only github-actions[bot]-authored comments count: a human (or a PR head
    account) pasting the marker must not suppress the real report.
    """
    for c in comments:
        body = c.get('body') or ''
        if (c.get('user', {}).get('login') == BOT_LOGIN
                and MARK in body and run_url in body):
            return True
    return False


def _eligible(event, current):
    mod_path = Path(__file__).with_name('check-deploy-candidate.py')
    spec = importlib.util.spec_from_file_location('check_deploy_candidate', mod_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # The deploy job already enforced the .github/ file gate; a changed head_sha
    # makes any new commit ineligible anyway, so no file listing is needed here.
    return mod.eligible(event, 'stg', current)


def api(path, *args):
    out = subprocess.check_output(['gh', 'api', path, *args], text=True)
    return json.loads(out) if out.strip() else {}


def api_pages(api_fn, path):
    """Follow pagination to the end; duplicates may hide past page 1."""
    page = 1
    while True:
        sep = '&' if '?' in path else '?'
        batch = api_fn(f'{path}{sep}per_page=100&page={page}')
        yield batch
        if len(batch) < 100:
            return
        page += 1


def report(api_fn, event, repo, number, body):
    """Post the comment for one PR. Returns 'posted' | 'skipped'.

    Reads all comment pages before deciding; POSTs only via
    issues/{pr}/comments. Never PATCHes pulls or comments.
    """
    current = api_fn(f'repos/{repo}/pulls/{number}')
    if not _eligible(event, current):
        return 'skipped'
    comments = []
    for batch in api_pages(api_fn, f'repos/{repo}/issues/{number}/comments'):
        comments.extend(batch)
    run_url = os.environ.get('DEPLOY_RUN_URL', '')
    if run_url and already_reported(comments, run_url):
        return 'skipped'
    api_fn(f'repos/{repo}/issues/{number}/comments', '-X', 'POST', '-f', f'body={body}')
    return 'posted'


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
    body = build_comment(uri, run['head_sha'], run_url, repo_url, when)
    failures = 0
    for pr in run.get('pull_requests', []):
        number = pr['number']
        try:
            result = report(api, event, repo, number, body)
            print(f'PR #{number}: {result}')
        except (ValueError, KeyError, subprocess.CalledProcessError) as e:
            failures += 1
            print(f'::error::PR #{number}: report failed ({e})')
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    main()
