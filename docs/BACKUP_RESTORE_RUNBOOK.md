# Backup e restauração do Botali

## Conciliação do histórico de migrações — 08/11/2026

O backup novo `20261108-124003-homologacao-YU4Thg` foi enviado ao Backblaze B2, baixado e conferido pelo SHA-256 `9a955cfa84dc595430b87cfa65b41d118811ea46b590ec600cc6acb340424545`. Antes do reparo, a homologação ainda registrava somente `202610070001`, `202610070002` e `202610070003` no histórico. A sequência de **28 arquivos da branch principal**, incluindo `202610270001_preserve_community_progress.sql`, foi reproduzida em PostgreSQL 17/PostGIS local isolado. O esquema do backup e o esquema reproduzido coincidiram em 28 tabelas, 33 políticas, 18 gatilhos, 9 índices, 42 chaves estrangeiras, 34 restrições, 23 tabelas com RLS e uma sequência. A única função extra no backup é `public.rls_auto_enable()`, gerenciada pelo Supabase. As definições em comum não tiveram divergências funcionais na comparação normalizada; os catálogos de combustíveis, serviços, bandeiras, badges e programa coincidiram. O reparo foi ensaiado em uma restauração local do backup: o histórico passou de 3 para 28 versões e as contagens de 10.006 postos, 80.014 relatos de preço e 90.028 eventos de contribuição permaneceram iguais. Esse ensaio não substitui uma restauração em projeto Supabase separado nem comprova que cada migração foi executada historicamente.

O reparo protegido é gerado por `supabase/backup/prepare_migration_history_repair.py` e executado por `reconcile_migration_history_live.ps1` após uma cópia recente verificada. O script só aceita o histórico inicial de três versões, verifica a presença das tabelas essenciais, acrescenta os registros faltantes em uma transação e confere o inventário antes/depois. Ele **não executa novamente as migrações**. Se o esquema, os catálogos, o histórico ou o backup mudarem, refaça a auditoria antes de usar o reparo.

Este procedimento valida que um backup do banco pode ser restaurado antes de qualquer retenção efetiva ou promoção para produção.

## Estado atual

Em 30/09/2026, `botali-homologacao` está no plano gratuito. O painel do Supabase confirma que esse plano não inclui backups físicos restauráveis nem a opção de restaurar para um novo projeto.

A primeira validação estrutural também identificou que `supabase_migrations.schema_migrations` não existe na homologação, pois as migrações iniciais foram aplicadas diretamente pelo editor SQL. Isso não invalida o esquema atual, mas deve aparecer como `migration_history_present: false` no inventário e ser regularizado antes de o projeto adotar migrações remotas automatizadas pelo CLI.

### Linha de base da homologação — 30/09/2026

O verificador foi executado sem alterar dados e aprovou PostGIS, funções essenciais, 17 tabelas públicas e RLS nas 17 tabelas. O inventário registrou 4 usuários, 4 perfis, 10.001 postos, 40.002 vínculos de combustíveis, 15.335 serviços de postos e 80.001 relatos de preço. Dentro desses totais estão os 10.000 postos, 80.000 preços e 2 usuários sintéticos da massa `[SYNTH HML]`.

Essa saída passa a ser a referência que um banco restaurado deve reproduzir. Como o aplicativo continua em uso, uma nova linha de base deve ser capturada imediatamente antes de cada backup futuro.

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
10. Compare o JSON do destino com `source-verification.json`. Quantidades, estado do histórico de migrações, RLS, funções essenciais e extensão PostGIS devem coincidir.
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
