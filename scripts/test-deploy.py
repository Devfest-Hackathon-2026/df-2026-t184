import importlib.util
import json
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
        self.eligible = load('check-deploy-candidate').eligible
        self.event = {'repository': {'full_name': 'owner/repo'}, 'workflow_run': {
            'conclusion': 'success', 'path': '.github/workflows/ci.yml',
            'head_repository': {'full_name': 'owner/repo'}, 'event': 'pull_request',
            'head_sha': 'abc', 'head_branch': 'feature'}}
        self.pr = {'state': 'open', 'base': {'ref': 'main', 'repo': {'full_name': 'owner/repo'}},
                   'head': {'sha': 'abc', 'repo': {'full_name': 'owner/repo'}}}

    def test_current_pr(self):
        self.assertTrue(self.eligible(self.event, 'stg', self.pr))

    def test_stale_and_closed_pr(self):
        self.pr['head']['sha'] = 'new'
        self.assertFalse(self.eligible(self.event, 'stg', self.pr))
        self.pr['head']['sha'] = 'abc'
        self.pr['state'] = 'closed'
        self.assertFalse(self.eligible(self.event, 'stg', self.pr))

    def test_fork_and_workflow_change(self):
        self.assertFalse(self.eligible(self.event, 'stg', self.pr, ['.github/workflows/ci.yml']))
        self.pr['head']['repo']['full_name'] = 'fork/repo'
        self.assertFalse(self.eligible(self.event, 'stg', self.pr))

    def test_old_main_rejected(self):
        self.event['workflow_run'].update(event='push', head_branch='main')
        self.assertFalse(self.eligible(self.event, 'prod', {'sha': 'new'}))
        self.assertTrue(self.eligible(self.event, 'prod', {'sha': 'abc'}))

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


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.mod = load('report-stg-deploy')
        self.event = {'repository': {'full_name': 'owner/repo', 'html_url': 'https://github.com/owner/repo'},
                      'workflow_run': {'conclusion': 'success', 'path': '.github/workflows/ci.yml',
                                       'head_repository': {'full_name': 'owner/repo'},
                                       'event': 'pull_request', 'head_sha': 'a' * 40}}
        self.pr = {'state': 'open', 'body': '本文\n',
                   'base': {'ref': 'main', 'repo': {'full_name': 'owner/repo'}},
                   'head': {'sha': 'a' * 40, 'repo': {'full_name': 'owner/repo'}}}
        self.uri = 'yorimichi-stg--df-2026-t184-prod.asia-east1.hosted.app'
        self.run_url = 'https://github.com/owner/repo/actions/runs/1'

    def test_block_appended_preserving_body(self):
        block = self.mod.build_block(self.uri, 'a' * 40, self.run_url,
                                     self.event['repository']['html_url'], '2026-01-01T00:00:00Z')
        new = self.mod.upsert_block(self.pr['body'], block)
        self.assertTrue(new.startswith('本文\n'))
        self.assertEqual(new.count(self.mod.MARK_BEGIN), 1)
        self.assertEqual(new.count(self.mod.MARK_END), 1)
        self.assertIn('https://' + self.uri, new)
        self.assertIn('yorimichi-stg', new)
        self.assertIn('df-2026-t184-prod', new)
        self.assertNotIn('token', new.lower())

    def test_block_replaced_idempotently(self):
        block1 = self.mod.build_block(self.uri, 'a' * 40, self.run_url,
                                      'https://github.com/owner/repo', 't1')
        block2 = self.mod.build_block(self.uri, 'b' * 40, self.run_url,
                                      'https://github.com/owner/repo', 't2')
        body = self.mod.upsert_block('前書き\n', block1)
        body2 = self.mod.upsert_block(body, block2)
        self.assertTrue(body2.startswith('前書き\n'))
        self.assertNotIn('a' * 40, body2)
        self.assertIn('b' * 40, body2)
        self.assertEqual(self.mod.upsert_block(body2, block2), body2)
        self.assertEqual(body2.count(self.mod.MARK_BEGIN), 1)

    def test_malformed_markers_fail_closed(self):
        block = self.mod.build_block(self.uri, 'a' * 40, self.run_url,
                                     'https://github.com/owner/repo', 't')
        for body in [f'x {self.mod.MARK_BEGIN}', f'{self.mod.MARK_END} y',
                     f'{self.mod.MARK_END} reversed {self.mod.MARK_BEGIN}',
                     f'{self.mod.MARK_BEGIN} a {self.mod.MARK_BEGIN} b {self.mod.MARK_END}']:
            with self.assertRaises(ValueError, msg=body):
                self.mod.upsert_block(body, block)

    def test_no_report_when_ineligible(self):
        for mutate in (lambda e, p: e['workflow_run'].update(conclusion='failure'),
                       lambda e, p: p.update(state='closed'),
                       lambda e, p: p['head'].update(sha='b' * 40),
                       lambda e, p: p['head']['repo'].update(full_name='fork/repo'),
                       lambda e, p: p['base'].update(ref='feature')):
            self.setUp()
            mutate(self.event, self.pr)
            self.assertIsNone(self.mod.planned_body(self.event, self.pr, self.uri,
                                                    self.run_url, 'https://github.com/owner/repo', 't'))

    def test_plan_skips_when_body_current(self):
        when = '2026-01-01T00:00:00Z'
        new = self.mod.planned_body(self.event, self.pr, self.uri,
                                    self.run_url, 'https://github.com/owner/repo', when)
        self.assertIsNotNone(new)
        self.pr['body'] = new
        self.assertIsNone(self.mod.planned_body(self.event, self.pr, self.uri,
                                                self.run_url, 'https://github.com/owner/repo', when))


if __name__ == '__main__':
    unittest.main()
