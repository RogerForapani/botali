#!/usr/bin/env python3
"""One-use local form for a bucket-scoped Backblaze B2 S3 key."""

from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import secrets
import subprocess
from urllib.parse import parse_qs


TOKEN = secrets.token_urlsafe(24)
RUNNER = Path(__file__).with_name("auto_backup_object_storage.ps1")


class Handler(BaseHTTPRequestHandler):
    submitted = False
    result = ""

    def log_message(self, _format: str, *_args: object) -> None:
        pass

    def page(self, body: str) -> None:
        data = f'''<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Backup externo do Botali</title>
<style>body{{font:16px system-ui;max-width:540px;margin:5vh auto;padding:20px;color:#171717}}
input,button{{box-sizing:border-box;width:100%;padding:12px;margin:8px 0 18px;font:inherit}}
button{{background:#22c55e;border:0;border-radius:8px;font-weight:700}}</style>
<h1>Backup externo do Botali</h1>{body}</html>'''.encode()
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
            self.page(f"<p>{escape(Handler.result)}</p>")
            return
        self.page(f'''<p>Preencha os dados do bucket privado e da chave limitada a ele.
As credenciais ficam protegidas pela sua conta Windows. Não envie a chave na conversa.</p>
<form method="post" action="/{TOKEN}">
<label>Nome do bucket<input name="bucket" required autocomplete="off"></label>
<label>Endpoint S3 exibido no Backblaze<input name="endpoint" required autocomplete="off"
placeholder="https://s3.us-west-004.backblazeb2.com"></label>
<label>Região do endpoint<input name="region" required autocomplete="off" placeholder="us-west-004"></label>
<label>Key ID<input name="access_key_id" type="password" required autocomplete="off"></label>
<label>Application Key<input name="secret_access_key" type="password" required autocomplete="off"></label>
<button>Salvar chave protegida</button></form>''')

    def do_POST(self) -> None:
        port = self.server.server_port
        if self.path != f"/{TOKEN}" or self.headers.get("Host") != f"127.0.0.1:{port}" or \
           self.headers.get("Origin") not in (None, "null", f"http://127.0.0.1:{port}") or Handler.submitted:
            self.send_error(403)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size < 8192:
                raise ValueError("Tamanho inválido")
            posted = parse_qs(self.rfile.read(size).decode("utf-8"), strict_parsing=True)
            fields = ("bucket", "endpoint", "region", "access_key_id", "secret_access_key")
            payload = {key: posted[key][0].strip() for key in fields}
            if any(not payload[key] or len(payload[key]) > 1024 for key in fields):
                raise ValueError("Campo inválido")
            if not payload["endpoint"].startswith("https://"):
                payload["endpoint"] = "https://" + payload["endpoint"]
            payload["endpoint"] = payload["endpoint"].rstrip("/")
            if payload["endpoint"] != f"https://s3.{payload['region']}.backblazeb2.com":
                raise ValueError("Endpoint e região não correspondem")
            payload.update(provider="Other", limit_bytes=8 * 1024**3)
            result = subprocess.run(
                ["pwsh.exe", "-NoProfile", "-NonInteractive", "-File", str(RUNNER),
                 "-Action", "ConfigureFromStdin"],
                input=json.dumps(payload), capture_output=True, text=True, timeout=30, check=False,
            )
            if result.returncode:
                raise ValueError("Falha ao guardar a chave")
            Handler.result = "Chave guardada no cofre local. O backup ainda precisa ser testado."
        except (ValueError, KeyError, UnicodeError, subprocess.TimeoutExpired, OSError):
            Handler.result = "Não foi possível guardar a chave. Abra uma nova página para tentar novamente."
        Handler.submitted = True
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
