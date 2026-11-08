#!/usr/bin/env python3
"""Generate guarded SQL to reconcile a previously audited Supabase history.

This does not compare live schema. Run the inventory/definition/catalog audit on
a fresh dump first, then rehearse the generated SQL on an isolated restore.
"""

from pathlib import Path
import re
import sys


MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
BASELINE = ("202610070001", "202610070002", "202610070003")


def main() -> None:
    records: list[tuple[str, str]] = []
    for path in sorted(MIGRATIONS.glob("*.sql")):
        match = re.fullmatch(r"(\d{12})_([a-z0-9_]+)\.sql", path.name)
        if not match:
            raise ValueError(f"Nome de migração inválido: {path.name}")
        records.append(match.groups())
    versions = [version for version, _ in records]
    if len(records) != 28 or len(set(versions)) != len(versions) or not all(v in versions for v in BASELINE):
        raise ValueError("A sequência esperada de 28 migrações mudou; refaça a auditoria")
    missing = [(version, name) for version, name in records if version not in BASELINE]
    baseline_sql = ", ".join(f"'{version}'" for version in BASELINE)
    values_sql = ",\n    ".join(f"('{version}', NULL::text[], '{name}')" for version, name in missing)
    print("-- Aplicar somente após comparar esquema e dados do backup ATUAL com as 28 migrações.")
    print("-- Ensaie primeiro no projeto restaurado e preserve o backup anterior.")
    print("BEGIN;")
    print("DO $repair$")
    print("BEGIN")
    print("  IF (SELECT array_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations)")
    print(f"     IS DISTINCT FROM ARRAY[{baseline_sql}]::text[] THEN")
    print("    RAISE EXCEPTION 'Histórico remoto mudou; revisão manual necessária';")
    print("  END IF;")
    print("  IF to_regclass('private.community_contribution_events') IS NULL")
    print("     OR to_regclass('public.stations') IS NULL THEN")
    print("    RAISE EXCEPTION 'Esquema Botali incompleto';")
    print("  END IF;")
    print("END")
    print("$repair$;")
    print("INSERT INTO supabase_migrations.schema_migrations (version, statements, name)")
    print("VALUES")
    print("    " + values_sql + ";")
    print("DO $verify$")
    print("BEGIN")
    print("  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 28 THEN")
    print("    RAISE EXCEPTION 'Histórico final não contém 28 migrações';")
    print("  END IF;")
    print("END")
    print("$verify$;")
    print("COMMIT;")
    print("SELECT count(*) AS migrated_versions,")
    print("       min(version) AS first_version, max(version) AS last_version")
    print("FROM supabase_migrations.schema_migrations;")


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        print(f"ERRO: {error}", file=sys.stderr)
        sys.exit(1)
