#!/usr/bin/env python3
"""Create and verify a portable, password protected GPG copy of a backup bundle."""

import argparse
import getpass
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run(command: list[str], password: bytes | None = None) -> None:
    result = subprocess.run(command, input=password, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(f"{command[0]} falhou: {result.stderr.decode(errors='replace').strip()}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--passphrase-stdin", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    bundle = args.bundle.resolve(strict=True)
    output = args.output.absolute()
    if not bundle.is_dir() or output.exists() or output.is_symlink():
        raise ValueError("Pasta de origem ou destino inválido; não sobrescrever arquivos")
    run([sys.executable, str(Path(__file__).with_name("verify_local_bundle.py")), str(bundle)])
    if args.passphrase_stdin:
        passphrase = sys.stdin.readline().rstrip("\r\n")
    else:
        passphrase = getpass.getpass("Senha da cópia criptografada: ")
        if passphrase != getpass.getpass("Repita a senha: "):
            raise ValueError("As senhas são diferentes")
    if len(passphrase) < 16:
        raise ValueError("A senha deve ter pelo menos 16 caracteres")
    password_bytes = (passphrase + "\n").encode()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="botali-encrypt-") as temp_dir:
        tar_path = Path(temp_dir) / "bundle.tar"
        decrypted_path = Path(temp_dir) / "decrypted.tar"
        run(["tar", "-C", str(bundle.parent), "-cf", str(tar_path), bundle.name])
        try:
            run(["gpg", "--batch", "--yes", "--pinentry-mode", "loopback", "--symmetric",
                 "--cipher-algo", "AES256", "--s2k-mode", "3", "--s2k-digest-algo", "SHA512",
                 "--s2k-count", "65011712", "--passphrase-fd", "0", "--output", str(output), str(tar_path)], password_bytes)
            run(["gpg", "--batch", "--yes", "--pinentry-mode", "loopback", "--decrypt",
                 "--passphrase-fd", "0", "--output", str(decrypted_path), str(output)], password_bytes)
            if digest(tar_path) != digest(decrypted_path):
                raise RuntimeError("A cópia descriptografada não corresponde ao pacote original")
        except Exception:
            output.unlink(missing_ok=True)
            raise
    os.chmod(output, 0o600)
    print(f"OK: arquivo criptografado e descriptografia verificados; SHA-256 {digest(output)}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        sys.exit(1)
