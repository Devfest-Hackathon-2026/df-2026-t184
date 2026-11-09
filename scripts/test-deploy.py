import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.mod = load('check-deploy-candidate')
        self.event = {'repository': {'full_name': 'owner/repo'}, 'workflow_run': {
            'conclusion': 'success', 'path': '.github/workflows/ci.yml',
            'head_repository': {'full_name': 'owner/repo'}, 'event': 'pull_request',
            'head_sha': 'abc', 'head_branch': 'feature'}}
        self.pr = {'state': 'open', 'base': {'ref': 'main', 'repo': {'full_name': 'owner/repo'}},
                   'head': {'sha': 'abc', 'repo': {'full_name': 'owner/repo'}}}

    def test_current_pr(self):
        self.assertTrue(self.mod.eligible(self.event, 'stg', self.pr))

    def test_stale_and_closed_pr(self):
        self.pr['head']['sha'] = 'new'
        self.assertFalse(self.mod.eligible(self.event, 'stg', self.pr))
        self.pr['head']['sha'] = 'abc'
        self.pr['state'] = 'closed'
        self.assertFalse(self.mod.eligible(self.event, 'stg', self.pr))

    def test_fork_and_workflow_change(self):
        self.assertFalse(self.mod.eligible(self.event, 'stg', self.pr, ['.github/workflows/ci.yml']))
        self.pr['head']['repo']['full_name'] = 'fork/repo'
        self.assertFalse(self.mod.eligible(self.event, 'stg', self.pr))

    def test_source_config_cannot_select_prod_or_run_hooks(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            trusted, source = root / 'trusted', root / 'source'
            trusted.mkdir(); source.mkdir()
            (trusted / 'apphosting.yaml').write_text('runConfig: {}\n')
            (trusted / 'apphosting.stg.yaml').write_text('env: [{secret: STG_KEY}]\n')
            (source / 'firebase.json').write_text('{"predeploy":"steal-token","apphosting":{"backendId":"yorimichi-prod"}}')
            (source / 'apphosting.stg.yaml').write_text('env: [{secret: PROD_KEY}]\n')
            (source / 'apphosting.prod.yaml').write_text('env: [{secret: PROD_KEY}]\n')
            (root / 'gha-creds-secret.json').write_text('test-only')
            load('prepare-deploy-source').prepare(trusted, source, 'stg')
            cfg = json.loads((source / 'firebase.json').read_text())
            self.assertNotIn('predeploy', cfg)
            self.assertEqual(cfg['apphosting'][0]['backendId'], 'yorimichi-stg')
            self.assertNotIn('PROD_KEY', (source / 'apphosting.stg.yaml').read_text())
            self.assertFalse((source / 'apphosting.prod.yaml').exists())
            self.assertFalse(list(source.glob('gha-creds*')))
            (source / 'escape').symlink_to(root / 'gha-creds-secret.json')
            with self.assertRaises(ValueError):
                load('prepare-deploy-source').prepare(trusted, source, 'stg')


class ProdReconcileTests(unittest.TestCase):
    """prod re-resolves the deploy target after winning the concurrency slot:
    current main head + the latest attempt of its canonical push CI run."""

    def setUp(self):
        self.mod = load('check-deploy-candidate')
        self.main = 'b' * 40
        self.ci_run = {'id': 7, 'run_attempt': 1, 'head_sha': self.main,
                       'head_branch': 'main', 'event': 'push',
                       'path': '.github/workflows/ci.yml',
                       'head_repository': {'full_name': 'owner/repo'}}
        self.calls = []

    def api(self, data):
        def fake(path):
            self.calls.append(path)
            for key, value in data.items():
                if key in path:
                    return value
            raise AssertionError(f'unexpected api path {path}')
        return fake

    def base_api(self, runs=None, attempt=None):
        data = {'commits/main': {'sha': self.main},
                'workflows/ci.yml/runs': {'workflow_runs': runs if runs is not None else [self.ci_run]},
                f"runs/{self.ci_run['id']}/attempts/{self.ci_run['run_attempt']}":
                    attempt or {'status': 'completed', 'conclusion': 'success'}}
        return self.api(data)

    def test_old_event_still_deploys_current_main(self):
        # Triggering event is an old CI rerun for sha C, but main is at B and
        # B's latest CI attempt succeeded: B is deployed, not C.
        self.assertEqual(self.mod.select_prod_sha(self.base_api(), 'owner/repo'), self.main)

    def test_newer_run_wins_over_old_run_with_more_attempts(self):
        older = dict(self.ci_run, id=6, run_attempt=9)
        self.assertEqual(self.mod.select_prod_sha(
            self.base_api(runs=[older, self.ci_run]), 'owner/repo'), self.main)

    def test_latest_main_ci_not_successful_skips(self):
        for attempt in ({'status': 'completed', 'conclusion': 'failure'},
                        {'status': 'in_progress', 'conclusion': None},
                        {'status': 'queued', 'conclusion': None}):
            with self.subTest(attempt=attempt):
                self.calls.clear()
                self.assertIsNone(self.mod.select_prod_sha(
                    self.base_api(attempt=attempt), 'owner/repo'))

    def test_rerun_latest_attempt_failure_not_treated_as_success(self):
        self.ci_run['run_attempt'] = 2
        api = self.base_api(attempt={'status': 'completed', 'conclusion': 'failure'})
        self.assertIsNone(self.mod.select_prod_sha(api, 'owner/repo'))
        self.assertTrue(any('attempts/2' in c for c in self.calls))

    def test_no_fallback_to_older_successful_sha(self):
        # No CI run for current main (only old SHA runs exist): skip.
        old = dict(self.ci_run, id=3, head_sha='a' * 40)
        api = self.base_api(runs=[old])
        self.assertIsNone(self.mod.select_prod_sha(api, 'owner/repo'))

    def test_untrusted_run_shapes_ignored(self):
        bad = [dict(self.ci_run, id=9, event='pull_request'),
               dict(self.ci_run, id=10, path='.github/workflows/other.yml'),
               dict(self.ci_run, id=11, head_repository={'full_name': 'fork/repo'}),
               dict(self.ci_run, id=12, head_branch='release')]
        api = self.base_api(runs=bad)
        self.assertIsNone(self.mod.select_prod_sha(api, 'owner/repo'))

    def test_runs_pagination(self):
        # Page 1 is full of untrusted rows (old SHA); the only usable run
        # sits on page 2 and must still be found.
        page1 = [dict(self.ci_run, id=i, head_sha='a' * 40) for i in range(100)]
        page2 = [self.ci_run]
        pages = {'&page=2': {'workflow_runs': page2}, '&page=1': {'workflow_runs': page1}}
        data = {'commits/main': {'sha': self.main},
                'workflows/ci.yml/runs': pages,
                f"runs/{self.ci_run['id']}/attempts/1":
                    {'status': 'completed', 'conclusion': 'success'}}
        def fake(path):
            if 'workflows/ci.yml/runs' in path:
                for key, value in pages.items():
                    if key in path:
                        return value
            for key, value in data.items():
                if isinstance(value, dict) and 'workflow_runs' not in value and key in path:
                    return value
            raise AssertionError(f'unexpected api path {path}')
        self.assertEqual(self.mod.select_prod_sha(fake, 'owner/repo'), self.main)


class RolloutTests(unittest.TestCase):
    def setUp(self):
        self.mod = load('apphosting-rollouts')

    def rollout(self, rid, state, created='2026-01-01T00:00:00Z', labels=None):
        return {'name': f'p/locations/x/backends/b/rollouts/{rid}', 'state': state,
                'createTime': created, 'labels': labels or {}}

    def paged_fetch(self, pages):
        def fetch(url, token):
            if 'pageToken=' in url:
                token_page = url.split('pageToken=')[1]
                return pages[int(token_page)]
            return pages[0]
        return fetch

    def test_list_follows_all_pages(self):
        pages = {0: {'rollouts': [self.rollout('a', 'SUCCEEDED')],
                     'nextPageToken': '1'},
                 1: {'rollouts': [self.rollout('b', 'PROGRESSING')],
                     'nextPageToken': '2'},
                 2: {'rollouts': [self.rollout('c', 'QUEUED')]}}
        rollouts, unreachable = self.mod.list_rollouts(
            self.paged_fetch(pages), 'base', 'tok')
        self.assertEqual([r['name'][-1] for r in rollouts], ['a', 'b', 'c'])
        self.assertEqual(unreachable, [])

    def test_inflight_beyond_first_page(self):
        rs = [self.rollout(f'r{i}', 'SUCCEEDED') for i in range(15)]
        rs.append(self.rollout('last', 'QUEUED'))
        self.assertEqual([r['name'] for r in self.mod.inflight(rs)],
                         [rs[-1]['name']])

    def test_paused_aborts_wait_with_reason(self):
        pages = {0: {'rollouts': [self.rollout('p1', 'PAUSED')]}}
        with self.assertRaises(SystemExit) as ctx:
            self.mod.wait(self.paged_fetch(pages), 'base', 'tok', 60, sleep_fn=lambda s: None)
        self.assertIn('PAUSED', str(ctx.exception))
        self.assertIn('p1', str(ctx.exception))

    def test_wait_until_inflight_settles(self):
        calls = {'n': 0}
        def fetch(url, token):
            calls['n'] += 1
            if calls['n'] == 1:
                return {'rollouts': [self.rollout('r', 'PROGRESSING')]}
            return {'rollouts': [self.rollout('r', 'SUCCEEDED')]}
        self.mod.wait(fetch, 'base', 'tok', 60, sleep_fn=lambda s: None)
        self.assertEqual(calls['n'], 2)

    def test_latest_by_create_time_not_list_order(self):
        rs = [self.rollout('new', 'SUCCEEDED', '2026-01-02T00:00:00Z'),
              self.rollout('old', 'SUCCEEDED', '2026-01-01T00:00:00Z')]
        self.assertEqual(self.mod.latest(rs)['name'].endswith('new'), True)

    def verify(self, fetch, epoch, deadline=60):
        return self.mod.verify(fetch, 'base', 'tok', epoch, deadline,
                               sleep_fn=lambda s: None)

    def test_verify_requires_cli_label_and_window(self):
        epoch = self.mod._epoch('2026-01-02T00:00:30Z')
        ours = self.rollout('ours', 'SUCCEEDED', '2026-01-02T00:00:10Z',
                            {'deployment-tool': 'cli-firebase'})
        foreign = self.rollout('foreign', 'SUCCEEDED', '2026-01-02T00:00:20Z',
                               {'deployment-tool': 'console'})
        pages = {0: {'rollouts': [ours, foreign]}}
        # Newest by time is 'foreign' but it lacks the CLI label: 'ours' wins.
        self.verify(self.paged_fetch(pages), epoch)

    def test_verify_rejects_missing_and_unsuccessful(self):
        epoch = self.mod._epoch('2026-01-02T00:00:30Z')
        stale = self.rollout('stale', 'SUCCEEDED', '2026-01-01T00:00:00Z',
                             {'deployment-tool': 'cli-firebase'})
        failed = self.rollout('bad', 'FAILED', '2026-01-02T00:00:10Z',
                              {'deployment-tool': 'cli-firebase'})
        for rs in ([stale], [failed]):
            pages = {0: {'rollouts': rs}}
            with self.assertRaises(SystemExit, msg=str(rs)):
                self.verify(self.paged_fetch(pages), epoch)

    def test_verify_polls_pinned_rollout_until_success(self):
        # The CLI exits while the rollout is still PROGRESSING; the rollout
        # commonly flips to SUCCEEDED seconds later (observed 2026-11-10:
        # job failed at 16:46:53, rollout SUCCEEDED at 16:46:55).
        epoch = self.mod._epoch('2026-01-02T00:00:30Z')
        ours = self.rollout('ours', 'PROGRESSING', '2026-01-02T00:00:10Z',
                            {'deployment-tool': 'cli-firebase'})
        calls = {'n': 0}

        def fetch(url, token):
            calls['n'] += 1
            if calls['n'] == 1:
                return {'rollouts': [ours]}
            return {'rollouts': [dict(ours, state='SUCCEEDED')]}
        self.verify(fetch, epoch)
        self.assertEqual(calls['n'], 2)

    def test_verify_rejects_terminal_states_of_pinned_rollout(self):
        epoch = self.mod._epoch('2026-01-02T00:00:30Z')
        for bad in ({'state': 'FAILED'}, {'state': 'PAUSED'},
                    {'state': 'PROGRESSING', 'paused': True},
                    {'state': 'FUTURE_UNKNOWN'}):
            with self.subTest(bad=bad):
                ours = self.rollout('ours', 'PROGRESSING',
                                    '2026-01-02T00:00:10Z',
                                    {'deployment-tool': 'cli-firebase'})
                calls = {'n': 0}

                def fetch(url, token):
                    calls['n'] += 1
                    if calls['n'] == 1:
                        return {'rollouts': [ours]}
                    return {'rollouts': [dict(ours, **bad)]}
                with self.assertRaises(SystemExit):
                    self.verify(fetch, epoch)

    def test_verify_times_out_while_pinned_rollout_in_flight(self):
        epoch = self.mod._epoch('2026-01-02T00:00:30Z')
        ours = self.rollout('ours', 'PROGRESSING', '2026-01-02T00:00:10Z',
                            {'deployment-tool': 'cli-firebase'})
        pages = {0: {'rollouts': [ours]}}
        with self.assertRaises(SystemExit) as ctx:
            self.verify(self.paged_fetch(pages), epoch, deadline=0)
        self.assertIn('timed out', str(ctx.exception))
        self.assertIn('ours', str(ctx.exception))

    def test_verify_never_adopts_another_rollouts_success(self):
        # After pinning, a different rollout reaching SUCCEEDED — even a
        # newer CLI-labelled one inside the job window — must not rescue
        # the pinned rollout. This job's deploy is that one name only.
        epoch = self.mod._epoch('2026-01-02T00:00:30Z')
        ours = self.rollout('ours', 'PROGRESSING', '2026-01-02T00:00:10Z',
                            {'deployment-tool': 'cli-firebase'})
        newer = self.rollout('newer', 'SUCCEEDED', '2026-01-02T00:00:20Z',
                             {'deployment-tool': 'cli-firebase'})
        calls = {'n': 0}

        def fetch(url, token):
            calls['n'] += 1
            if calls['n'] == 1:
                return {'rollouts': [ours]}
            return {'rollouts': [dict(ours, state='FAILED'), newer]}
        with self.assertRaises(SystemExit) as ctx:
            self.verify(fetch, epoch)
        self.assertIn('ours', str(ctx.exception))

    def test_verify_errors_if_pinned_rollout_vanishes(self):
        epoch = self.mod._epoch('2026-01-02T00:00:30Z')
        ours = self.rollout('ours', 'PROGRESSING', '2026-01-02T00:00:10Z',
                            {'deployment-tool': 'cli-firebase'})
        calls = {'n': 0}

        def fetch(url, token):
            calls['n'] += 1
            if calls['n'] == 1:
                return {'rollouts': [ours]}
            return {'rollouts': []}
        with self.assertRaises(SystemExit) as ctx:
            self.verify(fetch, epoch)
        self.assertIn('ours', str(ctx.exception))


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.mod = load('report-stg-deploy')
        self.event = {'repository': {'full_name': 'owner/repo', 'html_url': 'https://github.com/owner/repo'},
                      'workflow_run': {'conclusion': 'success', 'path': '.github/workflows/ci.yml',
                                       'head_repository': {'full_name': 'owner/repo'},
                                       'event': 'pull_request', 'head_sha': 'a' * 40}}
        self.pr = {'state': 'open', 'body': '人の本文\n',
                   'base': {'ref': 'main', 'repo': {'full_name': 'owner/repo'}},
                   'head': {'sha': 'a' * 40, 'repo': {'full_name': 'owner/repo'}}}
        self.uri = 'yorimichi-stg--df-2026-t184-prod.asia-east1.hosted.app'
        self.run_url = 'https://github.com/owner/repo/actions/runs/1'
        os.environ['DEPLOY_RUN_URL'] = self.run_url

    def comment(self, author='github-actions[bot]', body=''):
        return {'user': {'login': author}, 'body': body}

    def fake_api(self, comments):
        calls = []

        def api(path, *args):
            calls.append((path, args))
            if '/comments' in path and not args:
                page = int(path.split('&page=')[1]) if '&page=' in path else 1
                if page <= len(comments):
                    return comments[page - 1]
                return []
            if path.endswith('/pulls/1') or '/pulls/' in path:
                return self.pr
            return {}
        return api, calls

    def test_post_appends_comment_via_issues_endpoint(self):
        api, calls = self.fake_api([[]])
        body = self.mod.build_comment(self.uri, 'a' * 40, self.run_url,
                                      'https://github.com/owner/repo', 't')
        self.assertEqual(self.mod.report(api, self.event, 'owner/repo', 1, body), 'posted')
        posts = [c for c in calls if c[1] and 'POST' in c[1]]
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0][0], 'repos/owner/repo/issues/1/comments')
        # Nothing is ever PATCHed: the PR body and other comments stay intact.
        self.assertTrue(all('PATCH' not in c[1] for c in calls))
        self.assertEqual(self.pr['body'], '人の本文\n')

    def test_comment_content(self):
        body = self.mod.build_comment(self.uri, 'a' * 40, self.run_url,
                                      'https://github.com/owner/repo', 't')
        self.assertIn(self.mod.MARK, body)
        self.assertIn('https://' + self.uri, body)
        self.assertIn(self.run_url, body)
        self.assertIn('yorimichi-stg', body)
        self.assertIn('履歴', body)
        self.assertNotIn('token', body.lower())

    def test_run_url_prefix_does_not_suppress_other_run(self):
        other = self.mod.build_comment(self.uri, 'a' * 40, self.run_url + '0',
                                      'https://github.com/owner/repo', 't')
        self.assertFalse(self.mod.already_reported([self.comment(body=other)], self.run_url))

    def test_same_run_rerun_skips_when_bot_comment_exists(self):
        existing = self.comment(body=self.mod.build_comment(
            self.uri, 'a' * 40, self.run_url, 'https://github.com/owner/repo', 't'))
        api, calls = self.fake_api([[existing]])
        self.assertEqual(self.mod.report(api, self.event, 'owner/repo', 1, 'x'), 'skipped')
        self.assertFalse([c for c in calls if c[1] and 'POST' in c[1]])

    def test_duplicate_detected_on_second_page(self):
        page1 = [self.comment(body='普通のコメント')] * 100
        dup = self.comment(body=f'{self.mod.MARK}\n{self.run_url}')
        api, calls = self.fake_api([page1, [dup]])
        self.assertEqual(self.mod.report(api, self.event, 'owner/repo', 1, 'x'), 'skipped')

    def test_forged_marker_by_non_bot_does_not_suppress(self):
        forged = self.comment(author='attacker',
                              body=f'{self.mod.MARK}\n{self.run_url}')
        api, calls = self.fake_api([[forged]])
        body = self.mod.build_comment(self.uri, 'a' * 40, self.run_url,
                                      'https://github.com/owner/repo', 't')
        self.assertEqual(self.mod.report(api, self.event, 'owner/repo', 1, body), 'posted')
        # Bot comment for a *different* run also does not dedupe this one.
        other = self.comment(body=f'{self.mod.MARK}\n/actions/runs/999')
        api, calls = self.fake_api([[forged, other]])
        self.assertEqual(self.mod.report(api, self.event, 'owner/repo', 1, body), 'posted')

    def test_no_post_when_ineligible(self):
        for mutate in (lambda e, p: e['workflow_run'].update(conclusion='failure'),
                       lambda e, p: p.update(state='closed'),
                       lambda e, p: p['head'].update(sha='b' * 40),
                       lambda e, p: p['head']['repo'].update(full_name='fork/repo'),
                       lambda e, p: p['base'].update(ref='feature')):
            self.setUp()
            mutate(self.event, self.pr)
            api, calls = self.fake_api([[]])
            self.assertEqual(self.mod.report(api, self.event, 'owner/repo', 1, 'x'), 'skipped')
            self.assertFalse([c for c in calls if c[1] and 'POST' in c[1]])


class StatusTests(unittest.TestCase):
    """Commit-status publication for the 'Deploy / stg' check on the PR head.

    The script runs from the trusted main checkout with a statuses:write-only
    token. It must never publish success for a deploy that did not run, never
    trust PR-controlled data, and never let an old rerun overwrite the result
    of the newest CI attempt for the same head SHA.
    """

    RUN_URL = 'https://github.com/owner/repo/actions/runs/99'

    def setUp(self):
        self.mod = load('report-deploy-status')
        self.sha = 'a' * 40
        self.event = {'repository': {'full_name': 'owner/repo'},
                      'workflow_run': {'conclusion': 'success', 'id': 42,
                                       'path': '.github/workflows/ci.yml',
                                       'head_repository': {'full_name': 'owner/repo'},
                                       'event': 'pull_request', 'head_sha': self.sha,
                                       'run_attempt': 1,
                                       'pull_requests': [{'number': 1}]}}
        self.pr = {'state': 'open',
                   'base': {'ref': 'main', 'repo': {'full_name': 'owner/repo'}},
                   'head': {'sha': self.sha, 'repo': {'full_name': 'owner/repo'}}}
        self.ci_run = {'id': 42, 'head_sha': self.sha, 'event': 'pull_request',
                       'path': '.github/workflows/ci.yml',
                       'head_repository': {'full_name': 'owner/repo'}}

    def api(self, ci_runs=None, run_obj=None, prs=None):
        calls = []
        ci_runs = [self.ci_run] if ci_runs is None else ci_runs
        run_obj = run_obj or {'id': 42, 'run_attempt': 1}
        prs = {1: self.pr} if prs is None else prs

        def fake(path, *args):
            calls.append((path, args))
            if '/statuses/' in path:
                return {}
            if '/pulls/' in path:
                number = int(path.rsplit('/pulls/', 1)[1].split('?')[0])
                return prs.get(number, {})
            if 'workflows/ci.yml/runs' in path:
                page = int(path.split('&page=')[1])
                return {'workflow_runs': ci_runs if page == 1 else []}
            if 'actions/runs/' in path:
                return run_obj
            raise AssertionError(f'unexpected api path {path}')
        return fake, calls

    def posts(self, calls):
        return [(p, a) for p, a in calls if a and 'POST' in a and '/statuses/' in p]

    def fields(self, post):
        return dict(a.split('=', 1) for a in post[1] if '=' in a and not a.startswith('-'))

    def test_pending_posts_status_on_event_head(self):
        api, calls = self.api()
        self.assertEqual(self.mod.publish(api, self.event, mode='pending',
                                          run_url=self.RUN_URL), 'pending')
        posts = self.posts(calls)
        self.assertEqual(len(posts), 1)
        self.assertIn(f'/statuses/{self.sha}', posts[0][0])
        fields = self.fields(posts[0])
        self.assertEqual(fields['state'], 'pending')
        self.assertEqual(fields['context'], 'Deploy / stg')
        self.assertEqual(fields['target_url'], self.RUN_URL)

    def test_pending_skipped_for_non_main_base(self):
        self.pr['base']['ref'] = 'feature'
        api, calls = self.api()
        self.assertEqual(self.mod.publish(api, self.event, mode='pending',
                                          run_url=self.RUN_URL), 'skipped')
        self.assertFalse(self.posts(calls))

    def test_pending_skipped_when_pr_head_moved(self):
        self.pr['head']['sha'] = 'b' * 40
        api, calls = self.api()
        self.assertEqual(self.mod.publish(api, self.event, mode='pending',
                                          run_url=self.RUN_URL), 'skipped')
        self.assertFalse(self.posts(calls))

    def test_pending_skipped_when_pr_closed_or_foreign(self):
        for mutate in (lambda p: p.update(state='closed'),
                       lambda p: p['head']['repo'].update(full_name='fork/repo')):
            self.setUp()
            mutate(self.pr)
            api, calls = self.api()
            self.assertEqual(self.mod.publish(api, self.event, mode='pending',
                                              run_url=self.RUN_URL), 'skipped')
            self.assertFalse(self.posts(calls))

    def test_pending_skipped_when_newer_ci_attempt_exists(self):
        api, calls = self.api(run_obj={'id': 42, 'run_attempt': 2})
        self.assertEqual(self.mod.publish(api, self.event, mode='pending',
                                          run_url=self.RUN_URL), 'skipped')
        self.assertFalse(self.posts(calls))

    def test_final_success_only_when_deployed(self):
        api, calls = self.api()
        self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                          deploy_result='success', deployed='true',
                                          deploy_sha=self.sha, run_url=self.RUN_URL),
                         'success')
        fields = self.fields(self.posts(calls)[0])
        self.assertEqual(fields['state'], 'success')
        self.assertEqual(fields['target_url'], self.RUN_URL)

    def test_no_success_when_deploy_skipped(self):
        for deployed in ('false', ''):
            with self.subTest(deployed=deployed):
                api, calls = self.api()
                self.assertNotEqual(
                    self.mod.publish(api, self.event, mode='final',
                                     deploy_result='success', deployed=deployed,
                                     deploy_sha=self.sha, run_url=self.RUN_URL),
                    'success')
                self.assertEqual(self.fields(self.posts(calls)[0])['state'], 'error')

    def test_final_failure_and_cancelled(self):
        api, calls = self.api()
        self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                          deploy_result='failure', deployed='false',
                                          deploy_sha=self.sha, run_url=self.RUN_URL),
                         'failure')
        api, calls = self.api()
        self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                          deploy_result='cancelled', deployed='false',
                                          deploy_sha=self.sha, run_url=self.RUN_URL),
                         'error')

    def test_paused_or_job_skip_posts_error_not_silent_success(self):
        for result in ('skipped', 'success'):
            with self.subTest(result=result):
                api, calls = self.api()
                self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                                  deploy_result=result, deployed='false',
                                                  deploy_sha=self.sha, paused=True,
                                                  run_url=self.RUN_URL),
                                 'error')
                self.assertIn('DEPLOY_STG_PAUSED', self.fields(self.posts(calls)[0])['description'])

    def test_old_run_does_not_overwrite_newer_ci_result(self):
        # A rerun of an old CI run must not post over the newest attempt's status.
        api, calls = self.api(run_obj={'id': 42, 'run_attempt': 2})
        self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                          deploy_result='failure', deployed='false',
                                          deploy_sha=self.sha, run_url=self.RUN_URL),
                         'skipped')
        self.assertFalse(self.posts(calls))
        # A deploy spawned by an older CI run id for the same SHA is also stale.
        newer = dict(self.ci_run, id=43)
        api, calls = self.api(ci_runs=[self.ci_run, newer], run_obj={'id': 43, 'run_attempt': 1})
        self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                          deploy_result='failure', deployed='false',
                                          deploy_sha=self.sha, run_url=self.RUN_URL),
                         'skipped')
        self.assertFalse(self.posts(calls))

    def test_success_requires_deployed_sha_equal_event_head(self):
        api, calls = self.api()
        self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                          deploy_result='success', deployed='true',
                                          deploy_sha='c' * 40, run_url=self.RUN_URL),
                         'skipped')
        self.assertFalse(self.posts(calls))

    def test_foreign_or_failed_ci_posts_nothing(self):
        for mutate in (lambda e: e['workflow_run'].update(path='.github/workflows/other.yml'),
                       lambda e: e['workflow_run']['head_repository'].update(full_name='fork/repo')):
            self.setUp()
            mutate(self.event)
            api, calls = self.api()
            self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                              deploy_result='success', deployed='true',
                                              deploy_sha=self.sha, run_url=self.RUN_URL),
                             'skipped')
            self.assertFalse(self.posts(calls))

    def test_failed_ci_rerun_terminates_previous_pending(self):
        for conclusion in ('failure', 'cancelled', 'timed_out'):
            self.setUp()
            api, calls = self.api()
            self.assertEqual(self.mod.publish(api, self.event, mode='pending'), 'pending')
            self.event['workflow_run'].update(run_attempt=2, conclusion=conclusion)
            api, calls = self.api(run_obj={'id': 42, 'run_attempt': 2})
            self.assertEqual(self.mod.publish(api, self.event, mode='final',
                                              deploy_result='skipped'), 'error')
            self.assertEqual(self.fields(self.posts(calls)[0])['state'], 'error')
            self.assertEqual(self.mod.publish(api, self.event, mode='pending'), 'skipped')

    def test_short_sha_rejected(self):
        self.event['workflow_run']['head_sha'] = 'abc123'
        api, calls = self.api()
        with self.assertRaises(SystemExit):
            self.mod.publish(api, self.event, mode='final',
                             deploy_result='failure', deployed='false',
                             deploy_sha='abc123', run_url=self.RUN_URL)
        self.assertFalse(self.posts(calls))


if __name__ == '__main__':
    unittest.main()
