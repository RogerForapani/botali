#!/usr/bin/env python3
"""Run a local SQL file against Botali homologation; password arrives on stdin."""
import json
import os
from pathlib import Path
import subprocess
import sys

sql_file = Path(sys.argv[1]).resolve(strict=True)
password = json.load(sys.stdin)["database_password"]
ca = Path.home() / ".postgresql/supabase-prod-ca.crt"
connection = (
    "host=db.phsvoeljsaksglqrpstm.supabase.co port=5432 dbname=postgres "
    f"user=postgres sslmode=verify-full sslrootcert={ca} connect_timeout=20"
)
env = {**os.environ, "PGPASSWORD": password}
result = subprocess.run(
    ["psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "--dbname", connection, "--file", str(sql_file)],
    env=env, capture_output=True, text=True, encoding="utf-8", check=False,
)
if result.returncode:
    print("SQL falhou; confira o arquivo e o banco. Código:", result.returncode, file=sys.stderr)
    for line in result.stderr.splitlines():
        if "ERROR:" in line or "DETAIL:" in line:
            print(line[:300], file=sys.stderr)
    sys.exit(result.returncode)
print(result.stdout, end="")
