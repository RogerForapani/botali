#!/usr/bin/env python3
"""Make a complete encrypted Botali backup using secrets received on stdin.

The Windows launcher decrypts its user-bound vault and pipes a JSON object here.
Secrets are never accepted as command-line arguments or written to this folder.
"""

from __future__ import annotations

import hashlib
import csv
import json
import os
from pathlib import Path
import re
import subprocess
import sys

import boto3
from botocore.config import Config


ROOT = Path(__file__).resolve().parent
BACKUPS = Path.home() / "botali-backups"
BUCKET = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")


def run(argv: list[str], password: str | None = None) -> str:
    result = subprocess.run(
        argv, input=None if password is None else password + "\n",
        text=True, encoding="utf-8", capture_output=True, check=False,
    )
    if result.returncode:
        # Lower-level errors can include connection details; avoid printing them.
        raise RuntimeError(f"Etapa {Path(argv[0]).name} falhou (código {result.returncode})")
    return result.stdout


def safe_target(root: Path, bucket: str, name: str) -> Path:
    if not BUCKET.fullmatch(bucket):
        raise ValueError("Nome de bucket inválido")
    if not name or "\\" in name or "\x00" in name:
        raise ValueError("Nome de objeto inválido")
    parts = name.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ValueError("Caminho de objeto inseguro")
    target = root / "storage" / bucket / Path(*parts)
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError("Objeto fora da pasta de backup")
    return target


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def copy_storage(bundle: Path, config: dict[str, str]) -> None:
    endpoint = f"https://phsvoeljsaksglqrpstm.storage.supabase.co/storage/v1/s3"
    client = boto3.client(
        "s3", region_name=config["s3_region"], endpoint_url=endpoint,
        aws_access_key_id=config["s3_key_id"],
        aws_secret_access_key=config["s3_secret"],
        config=Config(s3={"addressing_style": "path"}, retries={"max_attempts": 3}),
    )
    seen: set[tuple[str, str]] = set()
    count = 0
    for bucket in client.list_buckets().get("Buckets", []):
        bucket_name = bucket["Name"]
        for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket_name):
            for item in page.get("Contents", []):
                name = item["Key"]
                if (bucket_name, name) in seen:
                    raise RuntimeError("Objeto duplicado na listagem do Storage")
                seen.add((bucket_name, name))
                target = safe_target(bundle, bucket_name, name)
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = target.with_name(target.name + ".partial")
                try:
                    with temporary.open("xb") as stream:
                        client.download_fileobj(bucket_name, name, stream)
                    if temporary.stat().st_size != item["Size"]:
                        raise RuntimeError("Tamanho do Storage divergente")
                    temporary.replace(target)
                finally:
                    temporary.unlink(missing_ok=True)
                count += 1
    expected_count = json.loads((bundle / "source-verification.json").read_text())["storage"]["objects"]
    with (bundle / "storage-objects.csv").open(newline="", encoding="utf-8") as stream:
        reader = csv.DictReader(stream)
        expected_names = {(row["bucket_id"], row["name"]) for row in reader}
    if count != expected_count or seen != expected_names:
        raise RuntimeError("O inventário do Storage mudou durante a cópia")


def main() -> None:
    config = json.load(sys.stdin)
    required = ("database_password", "archive_passphrase", "s3_key_id", "s3_secret", "s3_region")
    if any(not isinstance(config.get(key), str) or not config[key] for key in required):
        raise ValueError("Credenciais incompletas")
    if len(config["archive_passphrase"]) < 16:
        raise ValueError("A senha da cópia criptografada precisa ter 16 caracteres")

    print("Exportando banco...", flush=True)
    output = run(["bash", str(ROOT / "export_local_homologacao.sh")], config["database_password"])
    match = re.search(r"Cópia do banco concluída em: (.+)", output)
    if not match:
        raise RuntimeError("Caminho do backup ausente")
    bundle = Path(match.group(1)).resolve(strict=True)
    if not bundle.is_relative_to(BACKUPS.resolve()):
        raise RuntimeError("Backup fora da pasta esperada")

    print("Copiando fotos do Storage...", flush=True)
    copy_storage(bundle, config)
    run([sys.executable, str(ROOT / "finalize_local_bundle.py"), str(bundle)])
    archive = bundle.with_suffix(".gpg")
    print("Criptografando e testando a cópia...", flush=True)
    run([sys.executable, str(ROOT / "encrypt_local_bundle.py"), str(bundle), str(archive),
         "--passphrase-stdin"], config["archive_passphrase"])
    print(json.dumps({"archive": str(archive), "sha256": sha256(archive)}, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERRO: {type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
