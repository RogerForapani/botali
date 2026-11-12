"""Rotate only dated homologation backup directories under the fixed WSL root."""

import argparse
import re
import shutil
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path('/home/ningas/botali-backups')
NAME = re.compile(r'^\d{8}-\d{6}-homologacao-[A-Za-z0-9]+$')


def candidates(root: Path, now: datetime):
    if root.resolve() != ROOT or not root.is_dir():
        raise RuntimeError('Backup root is not the expected directory')
    found = []
    for child in root.iterdir():
        if not NAME.fullmatch(child.name) or not child.is_dir() or child.is_symlink():
            continue
        if child.resolve().parent != root:
            raise RuntimeError('Backup directory escaped root')
        created = datetime.strptime(child.name[:15], '%Y%m%d-%H%M%S')
        found.append((created, child))
    recent = sorted((entry for entry in found if now - entry[0] <= timedelta(days=30)), reverse=True)
    expired = sorted((entry for entry in found if now - entry[0] > timedelta(days=30)))
    return recent, expired


def remove_exact(root: Path, child: Path):
    if root.resolve() != ROOT or child.parent.resolve() != ROOT or not NAME.fullmatch(child.name):
        raise RuntimeError('Refusing directory outside backup scope')
    if child.is_symlink() or not child.is_dir():
        raise RuntimeError('Refusing symlink or non-directory')
    shutil.rmtree(child)
    if child.exists():
        raise RuntimeError('Directory remained after removal')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=('plan', 'test', 'apply'))
    parser.add_argument('--verified-archive', required=True)
    args = parser.parse_args()
    archive = Path(args.verified_archive).name
    if not archive.endswith('.gpg') or not NAME.fullmatch(archive[:-4]):
        raise RuntimeError('Verified archive name is invalid')
    now = datetime.now()
    recent, expired = candidates(ROOT, now)
    if len(recent) < 2 or recent[0][1].name != archive[:-4]:
        raise RuntimeError('Need two recent backups and the latest verified archive')
    if args.action == 'plan':
        print(f'Local backups: recent={len(recent)} expired={len(expired)}')
        return
    if args.action == 'test':
        fixture = ROOT / (f'{(now-timedelta(days=31)):%Y%m%d-%H%M%S}-homologacao-TESTLOCAL')
        fixture.mkdir(exist_ok=False)
        (fixture / 'fixture.txt').write_text('No personal data', encoding='utf-8')
        try:
            _, trial = candidates(ROOT, now)
            if fixture not in [child for _, child in trial]:
                raise RuntimeError('Expired fixture was not selected')
            remove_exact(ROOT, fixture)
            print('Local expired fixture removed and verified')
        finally:
            if fixture.exists():
                remove_exact(ROOT, fixture)
        return
    for _, child in expired:
        remove_exact(ROOT, child)
    print(f'Local expired backups removed and verified: {len(expired)}')


if __name__ == '__main__':
    main()
