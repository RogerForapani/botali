#!/usr/bin/env python3
"""Build snapshot-specific SQL for a new, empty Supabase restore project.

The original dump stays untouched. The generated app data omits push device
tokens so an isolated restore cannot send to real phones by accident.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


SELECTIONS = {
    "migration-schema.sql": [r" TABLE supabase_migrations schema_migrations "],
    "migration-history.sql": [r" TABLE DATA supabase_migrations schema_migrations "],
    "auth-instances.sql": [r" TABLE DATA auth instances "],
    # pg_restore's TOC puts identities before users; the FK needs the reverse.
    "auth-users.sql": [r" TABLE DATA auth users "],
    "auth-identities.sql": [r" TABLE DATA auth identities "],
    "storage-metadata.sql": [
        r" TABLE DATA storage buckets ",
        r" TABLE DATA storage objects ",
    ],
    "managed-custom.sql": [
        r" TRIGGER auth users on_auth_user_created ",
        r" POLICY storage objects botali_profile_avatars_.*_own ",
    ],
}


def run(*args: str, stdout=None) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=True, stdout=stdout, text=True)


def write_selected(dump: Path, toc: list[str], patterns: list[str], output: Path) -> None:
    chosen = [line for line in toc if any(re.search(p, line) for p in patterns)]
    for pattern in patterns:
        if not any(re.search(pattern, line) for line in chosen):
            raise ValueError(f"item ausente no dump: {pattern}")
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=False) as handle:
        handle.writelines(line + "\n" for line in chosen)
        list_path = Path(handle.name)
    try:
        run("pg_restore", "--no-owner", "--use-list", str(list_path),
            "--file", str(output), str(dump))
    finally:
        list_path.unlink(missing_ok=True)


def write_isolated_app_data(dump: Path, output: Path) -> int:
    process = subprocess.Popen(
        ["pg_restore", "--no-owner", "--data-only", "--schema=public",
         "--schema=private", "--file=-", str(dump)],
        stdout=subprocess.PIPE,
        text=True,
    )
    removed = 0
    skipping = False
    assert process.stdout is not None
    with output.open("w", encoding="utf-8", newline="\n") as stream:
        for line in process.stdout:
            if line.startswith("COPY private.price_alert_devices "):
                if skipping:
                    raise ValueError("COPY de dispositivos duplicado")
                skipping = True
                stream.write(line)
            elif skipping:
                if line.rstrip("\n") == r"\.":
                    skipping = False
                    stream.write(line)
                else:
                    removed += 1
            else:
                stream.write(line)
    if process.wait() != 0 or skipping:
        raise ValueError("extração dos dados incompleta")
    return removed


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def prepare(bundle: Path, destination: Path) -> None:
    bundle = bundle.resolve(strict=True)
    destination = destination.resolve()
    if destination.exists():
        raise ValueError("a pasta de preparação já existe")
    run(sys.executable, str(Path(__file__).with_name("verify_local_bundle.py")), str(bundle),
        stdout=subprocess.DEVNULL)
    inventory = json.loads((bundle / "source-verification.json").read_text(encoding="utf-8"))
    dump = bundle / "database.dump"
    toc = run("pg_restore", "--list", str(dump), stdout=subprocess.PIPE).stdout.splitlines()
    destination.mkdir(mode=0o700, parents=True)
    for name, patterns in SELECTIONS.items():
        write_selected(dump, toc, patterns, destination / name)
    default_lines = []
    for section, filename in (("pre-data", "app-pre-data.sql"),
                              ("post-data", "app-post-data.sql")):
        schema_file = destination / filename
        run("pg_restore", "--no-owner", "--section", section, "--schema=public",
            "--schema=private", "--file", str(schema_file), str(dump))
        schema_lines = schema_file.read_text(encoding="utf-8").splitlines(keepends=True)
        default_lines.extend(line for line in schema_lines
                             if line.startswith("ALTER DEFAULT PRIVILEGES "))
        schema_file.write_text(
            "".join(line for line in schema_lines
                    if not line.startswith("ALTER DEFAULT PRIVILEGES ")),
            encoding="utf-8",
        )
    if len(default_lines) != 18 or any(
        not re.match(r"ALTER DEFAULT PRIVILEGES FOR ROLE (postgres|supabase_admin) IN SCHEMA public ", line)
        for line in default_lines
    ):
        raise ValueError("privilégios padrão inesperados; revisar antes de importar")
    (destination / "postgres-default-privileges.sql").write_text(
        """-- Ajustar antes de criar tabelas. O papel postgres não pode alterar
-- privilégios padrão pertencentes a supabase_admin no projeto novo.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
""" + "".join(line for line in default_lines if "FOR ROLE postgres " in line),
        encoding="utf-8",
    )
    removed = write_isolated_app_data(dump, destination / "app-data-isolated.sql")
    if removed != 1:
        raise ValueError(f"esperado um dispositivo de push no dump; encontrados {removed}")

    (destination / "preflight.sql").write_text(
        """do $preflight$
begin
  if current_database() <> 'postgres'
     or to_regclass('public.stations') is not null
     or to_regclass('supabase_migrations.schema_migrations') is not null
     or (select count(*) from auth.users) <> 0
     or (select count(*) from storage.buckets) <> 0
     or (select count(*) from storage.objects) <> 0
     or (select count(*) from cron.job) <> 0
     or (select count(*) from vault.secrets) <> 0 then
    raise exception 'Destino nao esta vazio ou nao e o projeto de teste esperado';
  end if;
  if (select count(*) from pg_extension where extname in ('postgis', 'pg_net', 'pg_cron')) <> 3
     or to_regnamespace('private') is null
     or to_regnamespace('supabase_migrations') is null then
    raise exception 'Extensoes ou esquemas de teste ausentes';
  end if;
end
$preflight$;
""",
        encoding="utf-8",
    )
    counts = inventory["counts"]
    (destination / "postcheck.sql").write_text(
        """do $postcheck$
begin
  if (select count(*) from auth.users) <> %(users)d
     or (select count(*) from public.profiles) <> %(profiles)d
     or (select count(*) from public.stations) <> %(stations)d
     or (select count(*) from public.price_submissions) <> %(prices)d
     or (select count(*) from private.community_contribution_events) <> 90028
     or (select count(*) from private.data_retention_runs) <> 1
     or (select count(*) from private.station_price_monthly_stats) <> 1
     or (select count(*) from private.price_alert_devices) <> 0
     or (select count(*) from storage.buckets) <> %(buckets)d
     or (select count(*) from storage.objects) <> %(objects)d
     or (select max(version) from supabase_migrations.schema_migrations) <> '%(migration)s'
     or (select count(*) from cron.job) <> 0
     or (select count(*) from vault.secrets) <> 0 then
    raise exception 'Inventario restaurado diverge do backup ou isolamento falhou';
  end if;
end
$postcheck$;
""" % {
            "users": counts["auth_users"],
            "profiles": counts["profiles"],
            "stations": counts["stations"],
            "prices": counts["price_submissions"],
            "buckets": inventory["storage"]["buckets"],
            "objects": inventory["storage"]["objects"],
            "migration": inventory["latest_migration"],
        },
        encoding="utf-8",
    )
    (destination / "PREP_SHA256SUMS").write_text(
        "".join(f"{sha256(file)}  {file.name}\n" for file in sorted(destination.glob("*.sql"))),
        encoding="utf-8",
    )
    (destination / "RESTORE_STEPS.md").write_text(
        """# Importação isolada deste snapshot

Este pacote contém dados de contas restauradas. Mantenha a Data API, Google Auth,
cadastros e envios de alertas desativados. Use somente um projeto Supabase vazio.

1. Confirmar o ID do novo projeto e o estado vazio pelo painel.
2. Criar `private` e `supabase_migrations`, habilitar PostGIS, pg_net e pg_cron,
   e executar `postgres-default-privileges.sql` antes de criar tabelas.
3. Executar `preflight.sql` e interromper no primeiro erro.
4. Importar, em transação, `app-pre-data.sql`, `migration-schema.sql`,
   `auth-instances.sql`, `auth-users.sql`, `auth-identities.sql`, `app-data-isolated.sql`,
   `storage-metadata.sql`, `migration-history.sql`, `app-post-data.sql` e `managed-custom.sql`.
5. Executar `postcheck.sql` e `verify_restored_database.sql`; comparar o JSON
   com `source-verification.json` e conciliar ACLs antes de expor a API.
6. Restaurar o único binário do Storage e conferir o SHA-256 após download.

Os SQLs foram gerados deste dump. Não reutilize em outro snapshot. O token de
push real foi removido somente da cópia de importação; o dump original conserva
o registro. Este plano não configura Google, Firebase, Expo ou clientes móveis.
""",
        encoding="utf-8",
    )
    os.chmod(destination, 0o700)
    for file in destination.iterdir():
        os.chmod(file, 0o600)
    print(f"Preparação pronta: {destination}; token de push omitido: {removed}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: prepare_isolated_restore.py PACOTE DESTINO_NOVO")
    prepare(Path(sys.argv[1]), Path(sys.argv[2]))
