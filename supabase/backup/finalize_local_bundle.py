#!/usr/bin/env python3
"""Hash copied Storage binaries and verify a complete local backup bundle."""

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(f"Pacote não concluído: {message}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def finalize(bundle: Path) -> None:
    root = bundle.resolve(strict=True)
    if not root.is_dir():
        fail("o caminho não é uma pasta")
    inventory_path = root / "source-verification.json"
    if not inventory_path.is_file():
        fail("source-verification.json ausente")
    try:
        inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
        expected = inventory["storage"]["objects"]
    except (KeyError, ValueError, TypeError, UnicodeError) as error:
        fail(f"inventário do Storage inválido: {error}")
    if type(expected) is not int or expected < 0:
        fail("contagem de objetos inválida")

    storage = root / "storage"
    if storage.is_symlink():
        fail("pasta storage não pode ser um atalho")
    if storage.exists() and not storage.is_dir():
        fail("storage não é uma pasta")
    entries = list(storage.rglob("*")) if storage.exists() else []
    if any(path.is_symlink() for path in entries):
        fail("atalhos dentro de storage não são aceitos")
    files = sorted(path for path in entries if path.is_file())
    if len(files) != expected:
        fail(f"inventário registra {expected} objetos; a pasta storage contém {len(files)}")
    lines = []
    for path in files:
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            fail(f"arquivo inseguro: {path}")
        relative = path.relative_to(root).as_posix()
        if "\n" in relative or "\r" in relative:
            fail(f"nome de arquivo incompatível com SHA256SUMS: {relative}")
        lines.append(f"{sha256(path)}  {relative}\n")

    manifest = root / "STORAGE_SHA256SUMS"
    if manifest.is_symlink():
        fail("STORAGE_SHA256SUMS não pode ser um atalho")
    if manifest.exists():
        fail("pacote já finalizado; use verify_local_bundle.py para conferir sem regravar hashes")
    handle, temporary_name = tempfile.mkstemp(prefix=".storage-hashes-", dir=root)
    try:
        os.fchmod(handle, 0o600)
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            stream.writelines(lines)
        os.replace(temporary_name, manifest)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)

    result = subprocess.run(
        [sys.executable, str(Path(__file__).with_name("verify_local_bundle.py")), str(root)],
        check=False,
    )
    if result.returncode:
        fail("verificação final reprovada")
    print(f"Pacote completo: {len(files)} arquivo(s) do Storage; hashes conferidos")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        fail("uso: python3 finalize_local_bundle.py PASTA_DO_BACKUP")
    try:
        finalize(Path(sys.argv[1]))
    except (OSError, subprocess.SubprocessError) as error:
        fail(str(error))
