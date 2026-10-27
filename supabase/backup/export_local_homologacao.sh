#!/usr/bin/env bash
set -euo pipefail

# Exporta somente o banco da homologação. Objetos do Storage exigem cópia separada.
umask 077
backup_root="${HOME}/botali-backups"
install -d -m 700 "${backup_root}"
backup_dir="$(mktemp -d "${backup_root}/$(date +%Y%m%d-%H%M%S)-homologacao-XXXXXX")"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ca_certificate="${HOME}/.postgresql/supabase-prod-ca.crt"
if [[ ! -r "${ca_certificate}" ]]; then
  printf 'Certificado raiz do Supabase ausente: %s\n' "${ca_certificate}" >&2
  exit 1
fi
# A conexão direta evita credenciais temporariamente em cache no pooler após
# a rotação da senha. Este computador já foi testado com acesso IPv6 ao host.
connection="host=db.phsvoeljsaksglqrpstm.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=${ca_certificate} connect_timeout=20"

finish() {
  result=$?
  unset PGPASSWORD
  if (( result != 0 )); then
    printf 'Exportação não concluída. Verifique a pasta protegida: %s\n' "${backup_dir}" >&2
  fi
}
trap finish EXIT

printf 'Digite a senha do banco botali-homologacao e pressione Enter (não será exibida): '
IFS= read -r -s PGPASSWORD
# Quando a entrada vem de um pipe do Windows/WSL, a linha pode terminar em
# CRLF. O `read` remove LF, mas preserva CR, que invalidaria a senha no banco.
PGPASSWORD="${PGPASSWORD%$'\r'}"
printf '\n'
export PGPASSWORD

printf 'Conferindo conexão...\n'
psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="${connection}" -c 'SHOW server_version'

printf 'Registrando inventário da origem...\n'
psql -X -q -A -t -v ON_ERROR_STOP=1 --single-transaction \
  --dbname="${connection}" \
  --file="${script_dir}/verify_restored_database.sql" \
  > "${backup_dir}/source-verification.json"

printf 'Exportando banco...\n'
pg_dump --dbname="${connection}" --format=custom \
  --file="${backup_dir}/database.dump.partial"
mv -- "${backup_dir}/database.dump.partial" "${backup_dir}/database.dump"

pg_restore --list "${backup_dir}/database.dump" > "${backup_dir}/archive-contents.txt"
(
  cd "${backup_dir}"
  sha256sum database.dump archive-contents.txt source-verification.json > SHA256SUMS
)

printf 'Cópia do banco concluída em: %s\n' "${backup_dir}"
du -h "${backup_dir}/database.dump"
