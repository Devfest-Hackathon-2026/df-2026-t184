"""Reject stale/closed/foreign candidates and re-resolve what to deploy.

prod does not trust the triggering event SHA: after this job wins the
concurrency slot it re-reads the current main head and the *latest attempt*
of that SHA's canonical push CI run, then deploys that SHA only when CI is
successful. An old CI rerun therefore deploys the current main, never the
old SHA it ran for, and never falls back to an older successful SHA.
"""
import json
import os
import subprocess

CI_PATH = '.github/workflows/ci.yml'


def eligible(event, env, current, files=()):
    run = event['workflow_run']
    repo = event['repository']['full_name']
    if not event_ok(run, repo):
        return False
    return (run['event'] == 'pull_request' and current['state'] == 'open'
            and current['base']['ref'] == 'main' and current['base']['repo']['full_name'] == repo
            and current['head']['repo']['full_name'] == repo
            and current['head']['sha'] == run['head_sha']
            and not any(f.startswith('.github/') for f in files))


def event_ok(run, repo):
    """Trigger-level validation shared by both environments."""
    if run['conclusion'] != 'success' or run['path'] != CI_PATH:
        return False
    return run['head_repository']['full_name'] == repo


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))


def latest_ci_attempt(api_fn, repo, run_id, attempts):
    """Conclusion of the newest attempt only; reruns never inherit old results."""
    attempt = api_fn(f'repos/{repo}/actions/runs/{run_id}/attempts/{attempts}')
    if attempt.get('status') != 'completed':
        return 'running'
    return attempt.get('conclusion')


def select_prod_sha(api_fn, repo):
    """SHA prod may deploy: the current main head, iff its latest push CI
    attempt succeeded. Returns None otherwise (caller must skip)."""
    main_sha = api_fn(f'repos/{repo}/commits/main')['sha']
    runs = []
    for batch in api_pages_callable(
            api_fn, f'repos/{repo}/actions/workflows/ci.yml/runs'
            f'?event=push&branch=main&head_sha={main_sha}'):
        runs.extend(batch.get('workflow_runs', []))
    trusted = [r for r in runs
               if r['head_sha'] == main_sha and r['head_branch'] == 'main'
               and r['event'] == 'push' and r['path'] == CI_PATH
               and r['head_repository']['full_name'] == repo]
    if not trusted:
        return None
    latest = max(trusted, key=lambda r: (r.get('run_attempt', 1), r['id']))
    if latest_ci_attempt(api_fn, repo, latest['id'],
                         latest.get('run_attempt', 1)) != 'success':
        return None
    return main_sha


def api_pages_callable(api_fn, path):
    """Same pagination as api_pages but over an injected api function."""
    page = 1
    while True:
        sep = '&' if '?' in path else '?'
        batch = api_fn(f'{path}{sep}per_page=100&page={page}')
        yield batch
        items = batch if isinstance(batch, list) else batch.get('workflow_runs', [])
        if len(items) < 100:
            return
        page += 1


def resolve_sha(api_fn, event, repo, env):
    """Deployable SHA for this job, or None. Selection rules:

    stg: the CI event's PR head, only while the PR is still open, same-repo,
    main-bound, unchanged at head, and touched no .github/ file.
    prod: the current main head, only when its latest CI attempt succeeded.
    """
    if env == 'prod':
        return select_prod_sha(api_fn, repo)
    prs = event['workflow_run'].get('pull_requests', [])
    for pr in prs:
        number = pr['number']
        current = api_fn(f'repos/{repo}/pulls/{number}')
        files = []
        for batch in api_pages_callable(
                api_fn, f'repos/{repo}/pulls/{number}/files'):
            files.extend(f['filename'] for f in batch)
        # API caps file listing at 3000: never accept an incomplete inventory.
        if len(files) != current['changed_files']:
            continue
        if eligible(event, env, current, files):
            return event['workflow_run']['head_sha']
    return None


def main():
    with open(os.environ['GITHUB_EVENT_PATH']) as f:
        event = json.load(f)
    repo = event['repository']['full_name']
    env = os.environ['DEPLOY_ENV']
    run = event['workflow_run']
    sha = resolve_sha(api, event, repo, env) if event_ok(run, repo) else None
    if env == 'prod' and not (run['event'] == 'push' and run['head_branch'] == 'main'):
        sha = None
    expected = os.environ.get('EXPECTED_SHA')
    ok = sha is not None and (expected is None or sha == expected)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f'deployable={str(ok).lower()}\n')
        f.write(f'sha={sha or ""}\n')
    if ok:
        print(f'Candidate eligible: {sha}')
    elif sha is not None:
        print(f'Skipping: main moved to {sha} after this job selected {expected}')
    else:
        print('Skipping stale, closed, foreign, CI-unsuccessful, or workflow-changing candidate')


if __name__ == '__main__':
    main()
