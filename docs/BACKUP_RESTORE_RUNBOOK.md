# Backup e restauração do Botali

## Conciliação do histórico de migrações — 08/11/2026

O backup novo `20261108-124003-homologacao-YU4Thg` foi enviado ao Backblaze B2, baixado e conferido pelo SHA-256 `9a955cfa84dc595430b87cfa65b41d118811ea46b590ec600cc6acb340424545`. Antes do reparo, a homologação ainda registrava somente `202610070001`, `202610070002` e `202610070003` no histórico. A sequência de **28 arquivos da branch principal**, incluindo `202610270001_preserve_community_progress.sql`, foi reproduzida em PostgreSQL 17/PostGIS local isolado. O esquema do backup e o esquema reproduzido coincidiram em 28 tabelas, 33 políticas, 18 gatilhos, 9 índices, 42 chaves estrangeiras, 34 restrições, 23 tabelas com RLS e uma sequência. A única função extra no backup é `public.rls_auto_enable()`, gerenciada pelo Supabase. As definições em comum não tiveram divergências funcionais na comparação normalizada; os catálogos de combustíveis, serviços, bandeiras, badges e programa coincidiram. O reparo foi ensaiado em uma restauração local do backup: o histórico passou de 3 para 28 versões e as contagens de 10.006 postos, 80.014 relatos de preço e 90.028 eventos de contribuição permaneceram iguais. Esse ensaio não substitui uma restauração em projeto Supabase separado nem comprova que cada migração foi executada historicamente.

O reparo protegido é gerado por `supabase/backup/prepare_migration_history_repair.py` e executado por `reconcile_migration_history_live.ps1` após uma cópia recente verificada. O script só aceita o histórico inicial de três versões, verifica a presença das tabelas essenciais, acrescenta os registros faltantes em uma transação e confere o inventário antes/depois. Ele **não executa novamente as migrações**. Se o esquema, os catálogos, o histórico ou o backup mudarem, refaça a auditoria antes de usar o reparo.

**Resultado na homologação em 08/11:** o reparo protegido concluiu em transação, passando de 3 para 28 versões; a última é `202610270001`. Uma segunda leitura do banco confirmou a lista completa de versões. O inventário JSON imediatamente anterior e posterior coincidiu em contagens de postos, preços, usuários, Storage, tabelas públicas, RLS, privilégios e configuração padrão; a única diferença foi `latest_migration`. Os registros protegidos da operação estão em `/home/ningas/botali-backups/history-repair-20261108-124910/`, fora do repositório. Não houve nova execução do SQL das migrações nem alteração nos dados do aplicativo. A conciliação do histórico fica concluída para a homologação; um ensaio de recuperação cronometrado e a retenção seguem como portões separados.

## Ensaio cronometrado da cópia externa — 08/11/2026

Depois da conciliação, a rotina criou `20261108-125815-homologacao-tVce3O.gpg` no bucket privado do Backblaze B2 e conferiu o download pelo SHA-256 `8c4e404e1fe5ad3bd999f52477baad1da14317ffb47e4241921bdb5fdf1d6bd9`. O ensaio começou às **13:04:35** (São Paulo), baixou o arquivo novamente do B2 e restaurou seus dados em PostgreSQL 17/PostGIS local isolado, sem escutar na rede. O arquivo do Storage foi conferido pelo manifesto e pelo hash. A leitura local passou para 8 perfis, 10.006 postos, 80.014 relatos, 90.028 eventos de contribuição, 22 tabelas públicas com RLS e 28 migrações, além de uma consulta geográfica. Em seguida, uma conexão independente confirmou que a homologação original continuava acessível.

**Tempos medidos:** 34,751 s para download; 0,723 s para abrir e verificar o pacote; 9,743 s para restaurar o banco e consultar; 1,269 s para conferir a origem; **46,651 s no total**. A cópia tinha 6,3 minutos no início do ensaio; essa é a idade observada do ponto de recuperação, não uma garantia para incidentes futuros. O registro local está em `%LOCALAPPDATA%/BotaliBackup/recovery-drills/20261108-130435/result.json` e os dados extraídos, com acesso restrito, em `/home/ningas/botali-backups/recovery-drills/20261108-130435/`.

**Escopo:** o ensaio comprova obtenção da cópia externa, descriptografia, integridade, recuperação das tabelas do aplicativo e leitura da origem após o teste. O PostgreSQL local usa identificadores de usuários em uma tabela Auth substituta; não restaura o serviço Supabase Auth nem testa login. O aplicativo não foi apontado para o destino, não houve congelamento real de escritas, virada ou reversão de tráfego. Portanto, 46,651 s **não é o tempo de recuperação completo do serviço**. A etapa seguinte usa um projeto Supabase isolado e um aplicativo móvel de teste; o projeto principal fica fora desse ensaio.

## Restauração remota isolada — 08/11/2026

O projeto temporário `botali-restore-drill-20261108` (`madrjvnuycxvrahqhizg`) foi criado em São Paulo com a Data API desligada. O arquivo externo `20261108-125815-homologacao-tVce3O.gpg` foi extraído e conferido novamente, e `prepare_isolated_restore.py` gerou SQL específico para o snapshot em pasta privada. A importação omitiu o único token de push real para impedir notificações acidentais a aparelhos de usuários. `restore_isolated_drill.sh` recusaria a homologação como destino, conferiu que o projeto temporário estava vazio e importou o esquema, as contas, os dados, o histórico e os metadados do Storage.

**Resultado do banco:** a importação começou às 13:40:54 (São Paulo) e a comparação final terminou em 13:52:44; **710 segundos (11 min 50 s)** para preparar o esquema, importar e verificar o banco remoto. O snapshot tinha cerca de **42 min 38 s** quando a importação começou. As 8 contas, 10.006 postos, 80.014 preços, 90.028 eventos comunitários, 22 tabelas públicas com RLS, um bucket, um registro de objeto e a migração final `202610270001` coincidiram com o backup. Privilégios de tabelas e funções também passaram na comparação normalizada. A origem foi consultada novamente após o ensaio e continuou acessível com suas 28 migrações. Os resultados privados estão em `/home/ningas/botali-backups/20261108-restore-prep-v1/remote-drill-result.json` e `target-verification.json`.

**Storage e leitura de visitante:** o binário sintético `botali-storage-fixture-20261017.jpg` foi reposto no nome original do bucket privado `profile-avatars`. A prévia carregou e o arquivo baixado tinha 37.218 bytes e SHA-256 `f74c26c3759fd872d2b4a88b6fc75eb4e60e4147150226967c1df46efbe41631`, igual ao manifesto da origem. Uma cópia extra `(1).jpg` criada no primeiro envio foi removida com autorização; o bucket voltou a mostrar um único arquivo. A Data API do projeto temporário foi ativada apenas para consultar como `anon` as funções usadas pelo aplicativo. `nearby_stations_v3` e `stations_in_map_bounds_v1` retornaram 200 postos cada na primeira página; para dez postos da consulta por raio, `community_prices_for_stations` retornou 40 preços com valor, e as relações de serviços e combustíveis retornaram 8 e 40 registros. Em seguida, a Data API foi desligada, o painel recarregado mostrou `Enable Data API` desativado e uma nova chamada HTTP recebeu 503. O aplicativo principal não foi redirecionado.

**Ainda não é um RTO completo:** não houve login, teste no APK separado, troca de tráfego, congelamento de escritas ou reversão do aplicativo. A idade do snapshot é uma observação deste ensaio, não um limite garantido de perda de dados. Não liberar retenção destrutiva nem classificar o plano completo como aprovado antes dessas verificações.

### APK separado do ensaio

A branch `codex/restore-drill-apk-20261108` prepara o perfil EAS `restore-drill-20261108` para o projeto temporário `madrjvnuycxvrahqhizg`. O APK usa o pacote Android `com.botali.app.restoreauth`, o nome **Botali (teste de restauro)**, o retorno `botali-restore://auth/callback` e uma chave publicável própria do projeto restaurado. As atualizações OTA, o cadastro de push e a exclusão de conta ficam desativados nesse perfil; o pacote principal `com.botali.app` mantém sua configuração. A compilação EAS `d2b6cc62-a08b-4250-b7fc-f800008f1e49` terminou com sucesso: versão 1.0.5, build 4, APK em `https://expo.dev/accounts/ningas/projects/botali/builds/d2b6cc62-a08b-4250-b7fc-f800008f1e49`. A checagem de tipos, `npm run lint` e `npm run build` passaram. Antes de testar o APK no aparelho, autorizar temporariamente o pacote na chave Android Maps e abrir a Data API somente durante o teste. Para login Google, preparar um cliente OAuth e retorno exclusivos do restauro, com remoção depois do ensaio. Registrar o resultado no aparelho e reverter todos os acessos temporários.

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
