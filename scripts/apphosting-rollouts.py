"""Paginated App Hosting rollout inspection shared by deploy workflows.

Subcommands:
  wait    Block until no QUEUED/PENDING_BUILD/PROGRESSING rollout remains.
          A PAUSED rollout aborts immediately with its name, because waiting
          it out silently races whoever resumes it later. Times out per
          WAIT_DEADLINE_SECONDS (default 1200).
  verify  Confirm the newest rollout created inside this job's window
          (createTime >= JOB_START_EPOCH - 60, label deployment-tool starting
          with 'cli-firebase') reached SUCCEEDED. Correlation is time + the
          firebase-tools deployment-tool label, not an exclusive operation
          id: the CLI does not print the rollout id (firebase-tools 15.35.0),
          so a same-window deploy by another CLI caller cannot be ruled out.

All list calls follow nextPageToken to the end; the first page's 10/20
entries are never trusted as the whole picture.
"""
import datetime
import json
import os
import sys
import time
import urllib.request

IN_FLIGHT = frozenset(('QUEUED', 'PENDING_BUILD', 'PROGRESSING'))
_CLI_LABEL_PREFIX = 'cli-firebase'
_SKEW_SECONDS = 60


def fetch_json(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def list_rollouts(fetch, api_base, token):
    """All rollouts across every page, plus any unreachable locations."""
    rollouts, unreachable = [], []
    page_token = ''
    while True:
        url = f'{api_base}/rollouts?pageSize=100'
        if page_token:
            url += f'&pageToken={page_token}'
        body = fetch(url, token)
        rollouts.extend(body.get('rollouts') or [])
        unreachable.extend(body.get('unreachable') or [])
        page_token = body.get('nextPageToken') or ''
        if not page_token:
            return rollouts, sorted(set(unreachable))


def inflight(rollouts):
    return [r for r in rollouts if r.get('state') in IN_FLIGHT]


def paused(rollouts):
    return [r for r in rollouts
            if r.get('state') == 'PAUSED' or r.get('paused')]


def latest(rollouts):
    """Newest rollout by createTime; None for an empty list."""
    if not rollouts:
        return None
    return max(rollouts, key=lambda r: r.get('createTime', ''))


def job_rollouts(rollouts, since_epoch):
    """Rollouts attributable to this job: created inside the time window by
    the firebase-tools CLI (deployment-tool label, firebase-tools 15.35.0)."""
    return [r for r in rollouts
            if _epoch(r.get('createTime')) >= since_epoch - _SKEW_SECONDS
            and (r.get('labels') or {}).get('deployment-tool', '')
            .startswith(_CLI_LABEL_PREFIX)]


def _epoch(iso):
    if not iso:
        return 0
    return int(datetime.datetime.fromisoformat(
        iso.replace('Z', '+00:00')).timestamp())


def wait(fetch, api_base, token, deadline_seconds, sleep_fn=time.sleep):
    deadline = time.monotonic() + deadline_seconds
    while True:
        rollouts, unreachable = list_rollouts(fetch, api_base, token)
        if unreachable:
            print(f'::warning::unreachable locations: {", ".join(unreachable)}')
        hold = paused(rollouts)
        if hold:
            names = ', '.join(r['name'] for r in hold)
            raise SystemExit(
                f'::error::rollout(s) PAUSED: {names}. Resume or delete them in '
                'the Cloud console first; waiting would race whoever resumes them.')
        active = inflight(rollouts)
        if not active:
            return
        if time.monotonic() >= deadline:
            names = ', '.join(r['name'] for r in active)
            raise SystemExit(f'::error::timed out waiting for in-flight rollout(s): {names}')
        print(f'waiting for {len(active)} in-flight rollout(s)...')
        sleep_fn(15)


def verify(fetch, api_base, token, since_epoch):
    rollouts, _ = list_rollouts(fetch, api_base, token)
    candidates = job_rollouts(rollouts, since_epoch)
    newest = latest(candidates)
    if newest is None:
        raise SystemExit(
            '::error::no rollout created by this job found; deploy may have been skipped')
    if newest.get('state') != 'SUCCEEDED':
        raise SystemExit(
            f"::error::latest rollout {newest['name']} state is "
            f"'{newest.get('state')}', expected 'SUCCEEDED'")
    print(f"rollout {newest['name']} state={newest['state']}")


def main():
    api_base = os.environ['API_BASE']
    token = os.environ['GCP_ACCESS_TOKEN']
    command = sys.argv[1] if len(sys.argv) > 1 else ''
    if command == 'wait':
        wait(fetch_json, api_base, token,
             int(os.environ.get('WAIT_DEADLINE_SECONDS', '1200')))
    elif command == 'verify':
        verify(fetch_json, api_base, token, int(os.environ['JOB_START_EPOCH']))
    else:
        raise SystemExit('usage: apphosting-rollouts.py wait|verify')


if __name__ == '__main__':
    main()
