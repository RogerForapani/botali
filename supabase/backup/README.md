# Backup local de homologação

`export_local_homologacao.sh` exporta o banco de **homologação** para uma pasta privada fora do repositório. Ele solicita a senha no terminal sem exibi-la, confere a conexão, grava o inventário de origem, cria `database.dump` e gera hashes com caminhos relativos. Requer WSL/Linux, PostgreSQL 17, acesso IPv6 ao banco e o certificado raiz do Supabase em `~/.postgresql/supabase-prod-ca.crt`.

O exportador **não copia os arquivos binários do Storage**. Se houver objetos, copie-os separadamente para `storage/` dentro da pasta privada e inclua cada arquivo em `SHA256SUMS` ou em um `STORAGE_SHA256SUMS` complementar. Não versione a pasta do backup, senhas, tokens ou chaves.

Antes de usar um backup em qualquer restauração, execute:

```bash
python3 supabase/backup/verify_local_bundle.py /caminho/da/pasta-do-backup
```

O verificador confere os hashes do banco, inventário e de **todos** os arquivos presentes em `storage/`, valida o JSON e pede ao `pg_restore` que leia o dump. Ele funciona sem senha e não acessa o Supabase. Uma aprovação indica integridade local, não demonstra que o backup é recente ou restaurável como serviço completo; siga `docs/BACKUP_RESTORE_RUNBOOK.md` para o ensaio isolado.

Backups antigos com caminhos absolutos em `SHA256SUMS` devem permanecer no local original para a verificação. Novas exportações usam caminhos relativos.
