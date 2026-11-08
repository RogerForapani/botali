#!/usr/bin/env bash
set -euo pipefail
umask 077

action="${1:?Use Check ou Apply}"
bundle="${2:?Informe o pacote de backup verificado}"
[[ "$action" == Check || "$action" == Apply ]] || { echo 'Ação inválida' >&2; exit 1; }
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
certificate="${HOME}/.postgresql/supabase-prod-ca.crt"
[[ -r "$certificate" ]] || { echo 'Certificado TLS ausente' >&2; exit 1; }
IFS= read -r -s PGPASSWORD
PGPASSWORD="${PGPASSWORD%$'\r'}"
[[ -n "$PGPASSWORD" ]] || { echo 'Senha do banco ausente' >&2; exit 1; }
export PGPASSWORD
trap 'unset PGPASSWORD' EXIT
connection="host=db.phsvoeljsaksglqrpstm.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=${certificate} connect_timeout=20"
psql_cmd=(psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="$connection")
versions="$("${psql_cmd[@]}" -c "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations")"
printf 'Histórico atual: %s\n' "$versions"
if [[ "$action" == Check ]]; then
  printf 'Tabela de eventos: %s\n' "$("${psql_cmd[@]}" -c "select to_regclass('private.community_contribution_events')")"
  exit 0
fi

[[ "$versions" == '202610070001,202610070002,202610070003' ]] || {
  echo 'Histórico mudou; reparo cancelado' >&2; exit 2;
}
python3 "$script_dir/verify_local_bundle.py" "$bundle" >/dev/null
python3 - "$bundle/source-verification.json" <<'PY'
from datetime import datetime, timezone, timedelta
import json
import sys
inventory = json.load(open(sys.argv[1], encoding='utf-8'))
checked = datetime.fromisoformat(inventory['checked_at'])
if datetime.now(timezone.utc) - checked > timedelta(hours=4):
    raise SystemExit('Backup anterior ao limite de quatro horas; reparo cancelado')
if inventory['latest_migration'] != '202610070003':
    raise SystemExit('Histórico do backup divergente; reparo cancelado')
PY

out_dir="${HOME}/botali-backups/history-repair-$(date +%Y%m%d-%H%M%S)"
install -d -m 700 "$out_dir"
"${psql_cmd[@]}" --single-transaction --file="$script_dir/verify_restored_database.sql" > "$out_dir/before.json"
python3 "$script_dir/prepare_migration_history_repair.py" > "$out_dir/repair.sql"
"${psql_cmd[@]}" --file="$out_dir/repair.sql" > "$out_dir/apply.log"
"${psql_cmd[@]}" --single-transaction --file="$script_dir/verify_restored_database.sql" > "$out_dir/after.json"
python3 - "$out_dir/before.json" "$out_dir/after.json" <<'PY'
import json
import sys
before = json.load(open(sys.argv[1], encoding='utf-8'))
after = json.load(open(sys.argv[2], encoding='utf-8'))
for record in (before, after):
    record.pop('checked_at', None)
    record.pop('latest_migration', None)
if before != after:
    raise SystemExit('Histórico atualizado, mas o inventário do aplicativo mudou; revisar os registros locais')
PY
count="$("${psql_cmd[@]}" -c 'select count(*) from supabase_migrations.schema_migrations')"
latest="$("${psql_cmd[@]}" -c 'select max(version) from supabase_migrations.schema_migrations')"
expected_latest="$(basename "$(find "$script_dir/../migrations" -maxdepth 1 -name '*.sql' | sort | tail -1)" | cut -d_ -f1)"
[[ "$count" == 28 && "$latest" == "$expected_latest" ]] || {
  echo 'Histórico atualizado, mas a conferência final falhou' >&2; exit 2;
}
printf 'Conciliação concluída: %s versões; última %s. Inventário do aplicativo preservado.\n' "$count" "$latest"
printf 'Registro protegido: %s\n' "$out_dir"
