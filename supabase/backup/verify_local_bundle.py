#!/usr/bin/env python3
"""Verify a local Botali backup bundle without connecting to Supabase."""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(f"Backup inválido: {message}")


def verify(bundle: Path) -> None:
    root = bundle.resolve(strict=True)
    if not root.is_dir():
        fail("o caminho informado não é uma pasta")

    checked: set[Path] = set()
    for manifest_name in ("SHA256SUMS", "STORAGE_SHA256SUMS"):
        manifest = root / manifest_name
        if not manifest.exists():
            if manifest_name == "SHA256SUMS":
                fail("SHA256SUMS ausente")
            continue
        for number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), 1):
            match = re.fullmatch(r"([0-9a-fA-F]{64})  (.+)", line)
            if not match:
                fail(f"linha {number} inválida em {manifest_name}")
            expected, name = match.groups()
            path = Path(name)
            target = (path if path.is_absolute() else root / path).resolve()
            if not target.is_relative_to(root) or not target.is_file():
                fail(f"arquivo ausente ou fora da pasta: {name}")
            if target in checked:
                fail(f"arquivo listado mais de uma vez: {name}")
            checked.add(target)
            digest = hashlib.sha256()
            with target.open("rb") as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(chunk)
            if digest.hexdigest().lower() != expected.lower():
                fail(f"hash divergente: {name}")
            print(f"OK: {target.relative_to(root)}")

    for required in ("database.dump", "archive-contents.txt"):
        if root / required not in checked:
            fail(f"{required} não está coberto por hash")
    inventories = [root / name for name in ("source-verification.json", "target-verification.json")]
    covered_inventories = [path for path in inventories if path in checked]
    if len(covered_inventories) != 1:
        fail("é necessário exatamente um inventário JSON coberto por hash")
    try:
        json.loads(covered_inventories[0].read_text(encoding="utf-8"))
    except (UnicodeError, json.JSONDecodeError) as error:
        fail(f"inventário JSON ilegível: {error}")

    storage = root / "storage"
    if storage.exists():
        if not storage.is_dir():
            fail("storage não é uma pasta")
        for file in storage.rglob("*"):
            if file.is_file() and file.resolve() not in checked:
                fail(f"arquivo do Storage sem hash: {file.relative_to(root)}")

    result = subprocess.run(
        ["pg_restore", "--list", str(root / "database.dump")],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode:
        fail(f"pg_restore não conseguiu ler o arquivo ({result.returncode})")
    print("OK: arquivo PostgreSQL legível; todos os arquivos do Storage estão cobertos por hash")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        fail("uso: python3 verify_local_bundle.py PASTA_DO_BACKUP")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, subprocess.SubprocessError) as error:
        fail(str(error))
