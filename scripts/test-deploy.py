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


if __name__ == '__main__':
    unittest.main()
