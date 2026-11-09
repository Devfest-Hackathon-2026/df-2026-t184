"""Use main's deployment config, never PR-controlled hooks/config/secret references."""
import json
import os
from pathlib import Path
import shutil
import sys


def prepare(trusted, source, env):
    if env not in ('stg', 'prod'):
        raise ValueError('Unknown environment')
    # A symlink anywhere could include files outside the intended source root.
    if any(p.is_symlink() for p in source.rglob('*')):
        raise ValueError('Symlinks are not accepted in deploy source')
    backend = f'yorimichi-{env}'
    cfg = {'apphosting': [{'backendId': backend, 'rootDir': '/',
           'alwaysDeployFromSource': True, 'ignore': ['node_modules', '.git', '.github', '.next',
           'storybook-static', '.env', '.env*', '**/.env', '**/.env*',
           'gha-creds-*.json', '**/gha-creds-*.json', 'firebase-debug*']}]}
    (source / 'firebase.json').write_text(json.dumps(cfg, indent=2) + '\n')
    # Remove all PR-selected App Hosting overrides, then install reviewed configs.
    for p in source.glob('apphosting*.yaml'):
        p.unlink()
    for name in ('apphosting.yaml', f'apphosting.{env}.yaml'):
        shutil.copyfile(trusted / name, source / name)
    (source / '.firebaserc').write_text('{"projects":{"default":"df-2026-t184-prod"}}\n')


if __name__ == '__main__':
    prepare(Path(sys.argv[1]), Path(sys.argv[2]), os.environ['DEPLOY_ENV'])
