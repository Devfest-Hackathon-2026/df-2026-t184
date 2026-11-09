"""Publish the 'Deploy / <env>' commit status for the CI event head SHA.

Runs from the trusted main checkout inside deploy-stg.yml with a token whose
only write scope is statuses:write. PR-controlled files are never read or
executed; only fixed strings and the run URL go into the status.

Two modes:

- pending: posted when the deploy job starts, only while the event SHA is
  still the head of an open, same-repo, main-bound PR.
- final: maps the deploy job result to success/failure/error. success is
  posted only when the job actually deployed (skip / paused / stale
  candidates never produce success).

Overwrite guard: commit statuses are append-only and the UI shows the newest
one per context, so before posting the script re-checks via the API that this
run was triggered by the latest attempt of the newest same-repo pull_request
CI run for that SHA. A stale rerun finishing late (or a cancelled/timed-out
run) cannot overwrite a newer run's result.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess

CI_PATH = '.github/workflows/ci.yml'
_SHA_RE = re.compile(r'[0-9a-f]{40}')


def _shared():
    mod_path = Path(__file__).with_name('check-deploy-candidate.py')
    spec = importlib.util.spec_from_file_location('check_deploy_candidate', mod_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def api(path, *args):
    out = subprocess.check_output(['gh', 'api', path, *args], text=True)
    return json.loads(out) if out.strip() else {}


def latest_ci(api_fn, repo, sha):
    """(run_id, latest_attempt) of the newest trusted PR CI run for sha."""
    runs = []
    for batch in _shared().api_pages_callable(
            api_fn, f'repos/{repo}/actions/workflows/ci.yml/runs'
                    f'?head_sha={sha}&event=pull_request'):
        runs.extend(batch.get('workflow_runs', []))
    trusted = [r for r in runs
               if r.get('head_sha') == sha and r.get('event') == 'pull_request'
               and r.get('path') == CI_PATH
               and r.get('head_repository', {}).get('full_name') == repo]
    if not trusted:
        return None
    latest = max(trusted, key=lambda r: r['id'])
    current = api_fn(f'repos/{repo}/actions/runs/{latest["id"]}')
    return latest['id'], current.get('run_attempt', 1)


def is_latest_trigger(api_fn, event):
    """True when this deploy run's triggering CI run is still the newest one
    for the head SHA and its attempt is still the latest attempt."""
    run = event['workflow_run']
    found = latest_ci(api_fn, event['repository']['full_name'], run['head_sha'])
    if not found:
        return False
    run_id, latest_attempt = found
    return run['id'] == run_id and run.get('run_attempt', 1) == latest_attempt


def head_still_current(api_fn, event):
    """Some event PR is still open, same-repo, and points at the event head."""
    run = event['workflow_run']
    repo = event['repository']['full_name']
    for pr in run.get('pull_requests', []):
        current = api_fn(f'repos/{repo}/pulls/{pr["number"]}')
        if (current.get('state') == 'open'
                and current.get('base', {}).get('ref') == 'main'
                and current.get('head', {}).get('sha') == run['head_sha']
                and current.get('head', {}).get('repo', {}).get('full_name') == repo
                and current.get('base', {}).get('repo', {}).get('full_name') == repo):
            return True
    return False


def final_state(result, deployed, paused, env):
    """Map the deploy job outcome to a commit status state + description."""
    if result == 'success' and deployed == 'true':
        return 'success', f'deployed to {env} backend and verified'
    if paused:
        return 'error', (f'DEPLOY_{env.upper()}_PAUSED: '
                         f'{env} deploy is paused')
    if result == 'success':
        return 'error', 'deploy skipped: stale, closed, or ineligible candidate'
    if result == 'failure':
        return 'failure', 'deploy failed (see the Actions run log)'
    if result == 'cancelled':
        return 'error', 'deploy run cancelled or timed out'
    return 'error', f'deploy did not run ({result or "unknown"})'


def post(api_fn, repo, sha, state, context, description, target_url):
    args = ['-X', 'POST', '-f', f'state={state}', '-f', f'context={context}',
            '-f', f'description={description}']
    if target_url:
        args += ['-f', f'target_url={target_url}']
    api_fn(f'repos/{repo}/statuses/{sha}', *args)


def publish(api_fn, event, mode, deploy_result='', deployed='', deploy_sha='',
            paused=False, run_url='', env='stg'):
    """Post one commit status. Returns the posted state or 'skipped'.

    Nothing is posted when the triggering CI event is not a successful,
    same-repo pull_request CI run, or when this run's trigger is no longer the
    newest CI attempt for the SHA.
    """
    run = event['workflow_run']
    repo = event['repository']['full_name']
    if run['event'] != 'pull_request' or not _shared().event_ok(run, repo):
        return 'skipped'
    sha = deploy_sha or run['head_sha']
    if not _SHA_RE.fullmatch(sha):
        raise SystemExit(f'status target is not a full commit SHA: {sha!r}')
    if not is_latest_trigger(api_fn, event):
        return 'skipped'
    context = f'Deploy / {env}'
    if mode == 'pending':
        if not head_still_current(api_fn, event):
            return 'skipped'
        state, description = 'pending', f'deploying to shared {env}'
    else:
        # A successful deploy must report on the exact commit the CI run saw;
        # any drift means the mapping is untrustworthy, so post nothing.
        if deployed == 'true' and sha != run['head_sha']:
            return 'skipped'
        state, description = final_state(deploy_result, deployed, paused, env)
    post(api_fn, repo, sha, state, context, description, run_url)
    return state


def main():
    with open(os.environ['GITHUB_EVENT_PATH']) as f:
        event = json.load(f)
    state = publish(
        api, event,
        mode=os.environ['STATUS_MODE'],
        deploy_result=os.environ.get('DEPLOY_RESULT', ''),
        deployed=os.environ.get('DEPLOYED', ''),
        deploy_sha=os.environ.get('DEPLOY_SHA', ''),
        paused=os.environ.get('DEPLOY_PAUSED', '') == 'true',
        run_url=os.environ.get('DEPLOY_RUN_URL', ''),
        env=os.environ.get('DEPLOY_ENV', 'stg'))
    print(f'Deploy / {os.environ.get("DEPLOY_ENV", "stg")} status: {state}')


if __name__ == '__main__':
    main()
