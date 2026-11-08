"""One-use localhost form for the Botali database export password.

The password is passed through stdin to export_local_homologacao.sh. It is never
written to disk or echoed to the terminal. The server binds only to loopback.
"""

from __future__ import annotations

from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import secrets
import subprocess
import sys
from threading import Thread
from urllib.parse import parse_qs


TOKEN = secrets.token_urlsafe(24)
SCRIPT = Path(__file__).with_name("export_local_homologacao.sh")


def wsl_path(path: Path) -> str:
    resolved = path.resolve()
    drive = resolved.drive.rstrip(":").lower()
    return f"/mnt/{drive}/{resolved.as_posix().split(':', 1)[1].lstrip('/')}"


class Handler(BaseHTTPRequestHandler):
    submitted = False
    result: tuple[str, str] | None = None

    def log_message(self, _format: str, *_args: object) -> None:
        pass

    def page(self, title: str, body: str, status: int = 200) -> None:
        html = f"""<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title><style>body{{font:16px system-ui;max-width:520px;
margin:8vh auto;padding:24px;color:#183126}}input,button{{box-sizing:border-box;
width:100%;padding:14px;margin-top:12px;font:inherit}}button{{background:#0bbd60;
border:0;border-radius:9px;font-weight:700}}pre{{white-space:pre-wrap}}</style>
<h1>{escape(title)}</h1>{body}</html>""".encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'")
        self.end_headers()
        self.wfile.write(html)

    def do_GET(self) -> None:
        if self.path == f"/{TOKEN}/status" and Handler.submitted:
            if Handler.result is None:
                self.page("Backup em andamento", f'<meta http-equiv="refresh" content="3;url=/{TOKEN}/status"><p>Aguarde a conclusão da exportação.</p>')
            else:
                title, message = Handler.result
                self.page(title, f"<p>{escape(message)}</p>")
            return
        if self.path != f"/{TOKEN}":
            self.send_error(404)
            return
        if Handler.submitted:
            self.send_response(303)
            self.send_header("Location", f"/{TOKEN}/status")
            self.end_headers()
            return
        self.page(
            "Backup local do Botali",
            f'<p>Digite a senha atual do banco <strong>botali-homologacao</strong>. '
            'Ela será usada somente para exportar o backup e não será armazenada.</p>'
            f'<form method="post" action="/{TOKEN}"><label for="password">Senha do banco</label>'
            '<input id="password" name="password" type="password" required autocomplete="off">'
            '<button type="submit">Iniciar backup local</button></form>',
        )

    def do_POST(self) -> None:
        expected_origin = f"http://127.0.0.1:{self.server.server_port}"
        origin = self.headers.get("Origin")
        local_host = self.headers.get("Host") == f"127.0.0.1:{self.server.server_port}"
        # The integrated browser submits from an opaque origin and suppresses
        # Referer. The unguessable one-use path remains the CSRF token.
        same_origin = origin in (expected_origin, "null", None)
        if self.path != f"/{TOKEN}" or not local_host or not same_origin:
            print(f"Form rejected: origin={origin!r}, local_host={local_host}", flush=True)
            self.send_error(403)
            return
        if Handler.submitted:
            self.send_response(303)
            self.send_header("Location", f"/{TOKEN}/status")
            self.end_headers()
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400)
            return
        if not 0 < length < 1024:
            self.send_error(400)
            return
        form = parse_qs(self.rfile.read(length).decode("utf-8"))
        password = form.get("password", [""])[0]
        if not password or len(password) > 512:
            self.send_error(400)
            return
        Handler.submitted = True
        Thread(target=self.export, args=(password,), daemon=True).start()
        self.send_response(303)
        self.send_header("Location", f"/{TOKEN}/status")
        self.end_headers()

    @staticmethod
    def export(password: str) -> None:
        try:
            result = subprocess.run(
                ["wsl.exe", "-d", "Ubuntu", "--exec", "/bin/bash", "--noprofile", "--norc", wsl_path(SCRIPT)],
                input=password + "\n",
                text=True,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=600,
                check=False,
            )
            if result.returncode == 0:
                lines = [line for line in result.stdout.splitlines() if "Cópia do banco concluída" in line]
                detail = lines[-1] if lines else "Exportação concluída."
                print(detail, flush=True)
                Handler.result = ("Backup do banco concluído", detail)
            else:
                print(f"Backup falhou (código {result.returncode}).", flush=True)
                Handler.result = ("Backup não concluído", "Confira a senha e a conexão do banco. Nenhuma senha foi salva.")
        except subprocess.TimeoutExpired:
            print("Backup excedeu o tempo limite.", flush=True)
            Handler.result = ("Backup não concluído", "A exportação excedeu o tempo limite.")


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    print(f"http://127.0.0.1:{server.server_port}/{TOKEN}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
