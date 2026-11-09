"""Reject stale/closed/foreign PRs and old main CI runs before authentication/deploy."""
import json
import os
import subprocess


def eligible(event, env, current, files=()):
    run = event['workflow_run']
    repo = event['repository']['full_name']
    if run['conclusion'] != 'success' or run['path'] != '.github/workflows/ci.yml':
        return False
    if run['head_repository']['full_name'] != repo:
        return False
    if env == 'prod':
        return run['event'] == 'push' and run['head_branch'] == 'main' and current['sha'] == run['head_sha']
    return (run['event'] == 'pull_request' and current['state'] == 'open'
            and current['base']['ref'] == 'main' and current['base']['repo']['full_name'] == repo
            and current['head']['repo']['full_name'] == repo
            and current['head']['sha'] == run['head_sha']
            and not any(f.startswith('.github/') for f in files))


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))


def main():
    with open(os.environ['GITHUB_EVENT_PATH']) as f:
        event = json.load(f)
    repo = event['repository']['full_name']
    env = os.environ['DEPLOY_ENV']
    run = event['workflow_run']
    if env == 'prod':
        ok = eligible(event, env, api(f'repos/{repo}/commits/main'))
    else:
        prs = run.get('pull_requests', [])
        ok = False
        for pr in prs:
            number = pr['number']
            current = api(f'repos/{repo}/pulls/{number}')
            files = []
            page = 1
            while True:
                batch = api(f'repos/{repo}/pulls/{number}/files?per_page=100&page={page}')
                files.extend(f['filename'] for f in batch)
                if len(batch) < 100:
                    break
                page += 1
            # API caps file listing at 3000: never accept an incomplete inventory.
            if len(files) != current['changed_files']:
                continue
            ok = eligible(event, env, current, files)
            if ok:
                break
    if not ok and os.environ.get('REQUIRE_CURRENT') == 'true':
        raise SystemExit('Candidate changed while deployment was waiting; refusing stale deployment')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f'deployable={str(ok).lower()}\n')
    print('Candidate eligible' if ok else 'Skipping stale, closed, foreign, or workflow-changing candidate')


if __name__ == '__main__':
    main()
