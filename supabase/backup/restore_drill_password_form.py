"""One-use loopback password form for a timed isolated Supabase restore."""

from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs
import secrets
import subprocess
import sys


TOKEN = secrets.token_urlsafe(24)
SCRIPT = Path(__file__).with_name("restore_isolated_drill.sh")
TARGET_REF = ""
PREP = ""
BUNDLE = ""


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
<title>{escape(title)}</title><style>body{{font:16px system-ui;max-width:540px;
margin:8vh auto;padding:24px;color:#183126}}input,button{{box-sizing:border-box;
width:100%;padding:14px;margin-top:12px;font:inherit}}button{{background:#0bbd60;
border:0;border-radius:9px;font-weight:700}}</style>
<h1>{escape(title)}</h1>{body}</html>""".encode("utf-8")
        self.send_response(status)
        for key, value in (
            ("Content-Type", "text/html; charset=utf-8"),
            ("Content-Length", str(len(html))),
            ("Cache-Control", "no-store"),
            ("Referrer-Policy", "no-referrer"),
            ("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'"),
        ):
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(html)

    def do_GET(self) -> None:
        if self.path == f"/{TOKEN}/status" and Handler.submitted:
            if Handler.result is None:
                self.page("Restauração em andamento", f'<meta http-equiv="refresh" content="4;url=/{TOKEN}/status"><p>Aguarde a conclusão da importação.</p>')
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
            "Restauração de teste do Botali",
            f'<p>Digite a senha do banco do projeto de teste <strong>{escape(TARGET_REF)}</strong>. '
            'Ela será usada só para importar o backup nesse projeto isolado e não será salva. '
            'A Data API e o login Google continuarão desligados.</p>'
            f'<form method="post" action="/{TOKEN}"><label for="password">Senha do banco temporário</label>'
            '<input id="password" name="password" type="password" required autocomplete="off">'
            '<button type="submit">Iniciar restauração de teste</button></form>',
        )

    def do_POST(self) -> None:
        expected_origin = f"http://127.0.0.1:{self.server.server_port}"
        origin = self.headers.get("Origin")
        local_host = self.headers.get("Host") == f"127.0.0.1:{self.server.server_port}"
        if self.path != f"/{TOKEN}" or not local_host or origin not in (expected_origin, "null", None):
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
        password = parse_qs(self.rfile.read(length).decode("utf-8")).get("password", [""])[0]
        if not password or len(password) > 512:
            self.send_error(400)
            return
        Handler.submitted = True
        Thread(target=self.restore, args=(password,), daemon=True).start()
        self.send_response(303)
        self.send_header("Location", f"/{TOKEN}/status")
        self.end_headers()

    @staticmethod
    def restore(password: str) -> None:
        try:
            result = subprocess.run(
                ["wsl.exe", "-d", "Ubuntu", "--user", "ningas", "--exec", "/bin/bash",
                 "--noprofile", "--norc", wsl_path(SCRIPT), TARGET_REF, PREP, BUNDLE],
                input=password + "\n", text=True, encoding="utf-8", errors="replace",
                capture_output=True, timeout=1800, check=False,
            )
            if result.returncode == 0:
                Handler.result = ("Banco restaurado", "A importação e o inventário passaram. Falta recolocar e verificar a imagem do Storage e testar o aplicativo separado.")
            elif result.returncode == 2:
                Handler.result = ("Importação requer revisão", "O banco foi importado, mas o inventário ainda tem diferença de privilégios ou configuração. Não ative a API.")
            else:
                Handler.result = ("Restauração não concluída", "A importação foi interrompida. Confira a senha e aguarde a análise do erro; não tente enviar novamente.")
            print(f"Restauração terminou com código {result.returncode}.", flush=True)
        except subprocess.TimeoutExpired:
            Handler.result = ("Restauração não concluída", "O processo excedeu o tempo limite e precisa de análise.")
            print("Restauração excedeu o tempo limite.", flush=True)


def main() -> None:
    global TARGET_REF, PREP, BUNDLE
    if len(sys.argv) != 4 or len(sys.argv[1]) != 20 or not sys.argv[1].islower():
        raise SystemExit("Uso: restore_drill_password_form.py PROJECT_REF PREP_DIR BUNDLE_DIR")
    TARGET_REF, PREP, BUNDLE = sys.argv[1:]
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    print(f"http://127.0.0.1:{server.server_port}/{TOKEN}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
