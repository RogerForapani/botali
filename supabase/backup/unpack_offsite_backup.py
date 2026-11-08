#!/usr/bin/env python3
"""Decrypt a downloaded offsite archive into a new private rehearsal folder."""

import json
from pathlib import Path
import subprocess
import sys
import tarfile
import time


def main() -> None:
    if len(sys.argv) != 4:
        raise ValueError("Uso: unpack_offsite_backup.py ARQUIVO.GPG PASTA_NOVA NOME_PACOTE")
    archive = Path(sys.argv[1]).resolve(strict=True)
    destination = Path(sys.argv[2]).resolve()
    bundle_name = sys.argv[3]
    if not bundle_name or Path(bundle_name).name != bundle_name or destination.exists():
        raise ValueError("Destino ou nome do pacote inválido")
    password = sys.stdin.readline().rstrip("\r\n")
    if len(password) < 16:
        raise ValueError("Senha do arquivo criptografado inválida")
    destination.mkdir(mode=0o700, parents=True)
    tar_path = destination / "downloaded-bundle.tar"
    started = time.monotonic()
    try:
        result = subprocess.run(
            ["gpg", "--batch", "--yes", "--pinentry-mode", "loopback", "--decrypt",
             "--passphrase-fd", "0", "--output", str(tar_path), str(archive)],
            input=(password + "\n").encode(), capture_output=True, check=False,
        )
        if result.returncode:
            raise RuntimeError("Não foi possível descriptografar o arquivo baixado")
        decrypt_seconds = round(time.monotonic() - started, 3)
        with tarfile.open(tar_path, "r:") as tar:
            members = tar.getmembers()
            if not members:
                raise ValueError("Arquivo de backup vazio")
            for member in members:
                path = Path(member.name)
                if (path.is_absolute() or not path.parts or path.parts[0] != bundle_name
                        or ".." in path.parts or not (member.isfile() or member.isdir())):
                    raise ValueError("Entrada insegura no pacote de backup")
            tar.extractall(destination, filter="data")
    finally:
        tar_path.unlink(missing_ok=True)
    bundle = destination / bundle_name
    verified = time.monotonic()
    verifier = Path(__file__).with_name("verify_local_bundle.py")
    result = subprocess.run([sys.executable, str(verifier), str(bundle)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise RuntimeError("Pacote extraído não passou na verificação dos hashes e do Storage")
    inventory = json.loads((bundle / "source-verification.json").read_text(encoding="utf-8"))
    print(json.dumps({
        "bundle": str(bundle),
        "decrypt_seconds": decrypt_seconds,
        "verify_seconds": round(time.monotonic() - verified, 3),
        "backup_checked_at": inventory["checked_at"],
        "backup_latest_migration": inventory["latest_migration"],
        "storage_objects": inventory["storage"]["objects"],
    }, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, tarfile.TarError) as error:
        print(f"ERRO: {error}", file=sys.stderr)
        sys.exit(1)
