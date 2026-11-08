#!/usr/bin/env python3
"""One-use loopback form to store backup secrets under Windows DPAPI."""

from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import secrets
import subprocess
from urllib.parse import parse_qs


TOKEN = secrets.token_urlsafe(24)
RUNNER = Path(__file__).with_name("auto_backup_windows.ps1")
S3_FIELDS = ("s3_key_id", "s3_secret", "s3_region")
OTHER_FIELDS = ("database_password", "archive_passphrase", "rclone_config_pass")


class Handler(BaseHTTPRequestHandler):
    submitted = False
    s3_saved = (Path(os.environ.get("LOCALAPPDATA", "")) / "BotaliBackup" / "s3-credentials.json").is_file()
    result = ""

    def log_message(self, _format: str, *_args: object) -> None:
        pass

    def page(self, title: str, body: str) -> None:
        data = f'''<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title>
<style>body{{font:16px system-ui;max-width:540px;margin:5vh auto;padding:20px;color:#183126}}
input,button{{box-sizing:border-box;width:100%;padding:12px;margin:8px 0 18px;font:inherit}}
button{{background:#0bbd60;border:0;border-radius:8px;font-weight:700}}</style>
<h1>{escape(title)}</h1>{body}</html>'''.encode()
        self.send_response(200)
        for key, value in (("Content-Type", "text/html; charset=utf-8"), ("Content-Length", str(len(data))),
                           ("Cache-Control", "no-store"), ("Referrer-Policy", "no-referrer"),
                           ("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'")):
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path != f"/{TOKEN}":
            self.send_error(404)
            return
        if Handler.submitted:
            self.page("Configuração do backup", f"<p>{escape(Handler.result)}</p>")
            return
        labels = {
            "database_password": "Senha atual do banco botali-homologacao",
            "archive_passphrase": "Senha forte do arquivo criptografado (mínimo 16 caracteres)",
            "s3_key_id": "S3 Access Key ID",
            "s3_secret": "S3 Secret Access Key",
            "s3_region": "Região S3",
            "rclone_config_pass": "Senha da configuração criptografada do Google Drive (rclone)",
        }
        fields = OTHER_FIELDS if Handler.s3_saved else S3_FIELDS
        inputs = "".join(
            f'<label>{escape(label)}<input name="{key}" type="{("text" if key == "s3_region" else "password")}" '
            f'value="{("sa-east-1" if key == "s3_region" else "")}" required autocomplete="off" '
            f'{("minlength=16" if key == "archive_passphrase" else "")}></label>'
            for key, label in labels.items() if key in fields
        )
        action = f"/{TOKEN}" if Handler.s3_saved else f"/{TOKEN}/s3"
        button = "Salvar outras credenciais" if Handler.s3_saved else "Proteger chave S3 neste computador"
        status = "<p>Chave S3 protegida. Preencha as outras credenciais.</p>" if Handler.s3_saved else ""
        self.page("Configurar backup automático do Botali",
                  "<p>As credenciais serão protegidas pela sua conta Windows e não serão enviadas a esta conversa. "
                  "Guarde a senha do arquivo criptografado em outro lugar seguro.</p>"
                  f'{status}<form method="post" action="{action}">{inputs}<button>{button}</button></form>')

    def do_POST(self) -> None:
        port = self.server.server_port
        if self.path not in (f"/{TOKEN}", f"/{TOKEN}/s3") or self.headers.get("Host") != f"127.0.0.1:{port}" or \
           self.headers.get("Origin") not in (None, "null", f"http://127.0.0.1:{port}") or Handler.submitted:
            self.send_error(403)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size < 8192:
                raise ValueError("Tamanho inválido")
            posted = parse_qs(self.rfile.read(size).decode("utf-8"), strict_parsing=True)
            s3_step = self.path.endswith("/s3")
            if s3_step and Handler.s3_saved:
                raise ValueError("Chave já salva")
            if not s3_step and not Handler.s3_saved:
                raise ValueError("Salve a chave S3 primeiro")
            fields = S3_FIELDS if s3_step else OTHER_FIELDS
            payload = {key: posted[key][0] for key in fields}
            if any(not payload[key] or len(payload[key]) > 1024 for key in fields):
                raise ValueError("Campo inválido")
            if not s3_step and len(payload["archive_passphrase"]) < 16:
                raise ValueError("Senha do arquivo curta")
            result = subprocess.run(
                ["pwsh.exe", "-NoProfile", "-NonInteractive", "-File", str(RUNNER),
                 "-Action", "StoreS3FromStdin" if s3_step else "ConfigureFromStdin"],
                input=json.dumps(payload), capture_output=True, text=True, timeout=30, check=False,
            )
            if result.returncode:
                print(f"Local vault command failed with exit code {result.returncode}", flush=True)
                diagnostic = result.stderr
                for value in payload.values():
                    diagnostic = diagnostic.replace(value, "[oculto]")
                print(diagnostic[:1200], flush=True)
                raise ValueError("Falha ao salvar")
            if s3_step:
                Handler.s3_saved = True
            else:
                Handler.submitted = True
                Handler.result = "Credenciais salvas e protegidas pela conta Windows."
        except (ValueError, KeyError, UnicodeError, subprocess.TimeoutExpired, OSError) as error:
            print(f"Local form failed: {type(error).__name__}: {error}", flush=True)
            Handler.submitted = True
            Handler.result = "Formulário inválido ou tempo excedido. Reabra uma nova página para tentar novamente."
        self.send_response(303)
        self.send_header("Location", f"/{TOKEN}")
        self.end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    print(f"http://127.0.0.1:{server.server_port}/{TOKEN}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
