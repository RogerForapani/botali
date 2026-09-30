# Backup e restauração do Botali

Este procedimento valida que um backup do banco pode ser restaurado antes de qualquer retenção efetiva ou promoção para produção.

## Estado atual

Em 30/09/2026, `botali-homologacao` está no plano gratuito. O painel do Supabase confirma que esse plano não inclui backups físicos restauráveis nem a opção de restaurar para um novo projeto.

Enquanto o projeto permanecer gratuito, a alternativa é um backup lógico pelo Supabase CLI. O ensaio exige:

- Docker Desktop, usado pelo comando `supabase db dump`;
- `psql`, para a restauração transacional;
- senha do banco de origem e do projeto temporário de destino;
- um terceiro projeto temporário ou uma organização/plano que permita criá-lo.

Nenhum endereço de conexão, senha, token ou arquivo de backup deve ser salvo no repositório.

## Arquivos do backup lógico

Guarde os arquivos fora do repositório, em uma pasta local temporária e protegida:

1. `roles.sql` — papéis personalizados;
2. `schema.sql` — estrutura do banco;
3. `data.sql` — dados;
4. `history_schema.sql` — estrutura do histórico de migrações;
5. `history_data.sql` — histórico de migrações;
6. `source-verification.json` — resultado de `supabase/backup/verify_restored_database.sql` antes do backup;
7. hashes SHA-256 dos arquivos acima.

## Procedimento

1. Execute `supabase/backup/verify_restored_database.sql` na origem e salve o JSON retornado.
2. Obtenha no painel a conexão **Session pooler** e a senha atual do banco. Não cole esses dados em arquivos versionados.
3. Gere os arquivos conforme a documentação oficial:

```powershell
npx supabase db dump --db-url $env:BOTALI_SOURCE_DB_URL -f roles.sql --role-only
npx supabase db dump --db-url $env:BOTALI_SOURCE_DB_URL -f schema.sql
npx supabase db dump --db-url $env:BOTALI_SOURCE_DB_URL -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
npx supabase db dump --db-url $env:BOTALI_SOURCE_DB_URL -f history_schema.sql --schema supabase_migrations
npx supabase db dump --db-url $env:BOTALI_SOURCE_DB_URL -f history_data.sql --use-copy --data-only --schema supabase_migrations
```

4. Calcule e guarde hashes dos arquivos:

```powershell
Get-FileHash roles.sql,schema.sql,data.sql,history_schema.sql,history_data.sql -Algorithm SHA256
```

5. Crie um projeto temporário vazio na mesma região. Nunca use produção como destino do ensaio.
6. Habilite no destino as extensões e configurações necessárias, incluindo PostGIS.
7. Antes da restauração, revogue privilégios padrão que poderiam ampliar o acesso das funções `anon` e `authenticated`.
8. Restaure em uma única transação, interrompendo no primeiro erro:

```powershell
psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command "SET session_replication_role = replica" --file data.sql --file history_schema.sql --file history_data.sql --dbname $env:BOTALI_TARGET_DB_URL
```

9. Execute `supabase/backup/verify_restored_database.sql` no destino.
10. Compare o JSON do destino com `source-verification.json`. Quantidades, última migração, RLS, funções essenciais e extensão PostGIS devem coincidir.
11. Faça uma consulta geográfica, carregue o consenso de 200 postos e teste login apenas com usuários sintéticos.
12. Apague o projeto temporário somente depois de guardar o relatório do ensaio e confirmar que nenhum aplicativo aponta para ele.

## Critério para liberar a retenção

A retenção efetiva na homologação só pode avançar quando:

- a restauração terminar sem erros;
- o verificador estrutural for aprovado;
- as contagens da origem e do destino coincidirem;
- busca, consenso, RLS e autenticação sintética funcionarem no destino;
- o relatório registrar data, origem, destino temporário, hashes e resultado;
- a remoção do projeto temporário for autorizada separadamente.

Depois disso, a retenção deve ser executada primeiro na homologação, com comparação antes/depois e repetição do teste de carga. Produção continua fora dessa etapa.

## Referências oficiais

- [Backup e restauração com Supabase CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Restauração para um novo projeto](https://supabase.com/docs/guides/platform/clone-project)
- [Checklist de produção e disponibilidade de backups](https://supabase.com/docs/guides/deployment/going-into-prod)
