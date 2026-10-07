# Ambientes do Botali

## Produção

- Supabase atual: `preco-na-bomba`.
- EAS: ambiente e canal `production`.
- Não recebe dados demonstrativos, ensaios destrutivos ou migrações sem validação prévia.
- A rotina efetiva de retenção permanece sem agendamento até a restauração de backup ser comprovada.

## Homologação

- Supabase: `botali-homologacao` (`phsvoeljsaksglqrpstm`).
- Alertas de preço: migrações `202610070001_price_alerts.sql`, `202610070002_price_alert_dispatch_auth.sql`, `202610070003_price_alert_dispatch_request.sql` e `202610070004_price_alert_device_session.sql` aplicadas somente em homologação em 07/10/2026. A Edge Function `price-alert-dispatch` foi implantada somente em homologação. O segredo e a URL de disparo estão no Vault; a verificação do segredo é restrita ao `service_role`. A credencial FCM V1 para `com.botali.app` foi cadastrada no Expo; iOS ainda não tem credenciais. O fluxo completo foi validado com preço sintético, push recebido, recibo Expo `ok` e abertura do posto ao toque. O agendamento automático também está ativo somente em homologação, com detalhes abaixo. Produção não recebeu as migrações nem a função.
- Firebase separado para push Android: projeto `botali-push`, plano Spark, Analytics desativado e app `com.botali.app` registrado em 07/10/2026. `apps/mobile/google-services.json` aponta para esse projeto e `app.config.js` o referencia. A API Firebase Cloud Messaging V1 aparece ativa no console. Duas chaves criadas em tentativas anteriores foram revogadas. Uma nova chave foi criada pelo Google Cloud e cadastrada como **FCM V1 service account key** no Expo em 07/10/2026; o identificador exibido no Expo corresponde à chave ativa. O arquivo JSON privado está fora do repositório, em Downloads, e não deve ser versionado nem compartilhado. Um aparelho registrou token em homologação; um push isolado de simulação recebeu HTTP 200 e recibo Expo `ok`. Isso comprova o transporte, mas ainda não o fluxo completo do alerta por preço.
- Novo build Android `preview` com `versionCode` 4 para incluir a configuração nativa do Firebase: `84cb2a88-efdd-4ac3-b76f-4f829db02a40`. O EAS confirmou `FINISHED` em 07/10/2026 e artefato disponível.
- Ensaio de preço em homologação: três relatos técnicos identificáveis (`md5('botali-hml-alert-test-20261007-1')::uuid`, `md5('botali-hml-alert-test-20261007-2')::uuid` e `md5('botali-hml-alert-test-20261007-3')::uuid`) publicaram gasolina a R$ 5,49 no posto sintético `[SYNTH HML] Posto 07322 - Ipiranga` (`1d8912e1-aed6-c169-4870-69a8d4d25cd9`), dentro do raio de 10 km do alerta. O terceiro relato usa o usuário técnico `botali-hml-alert-test-reporter-3@example.invalid`; o consenso chegou a 72% com três colaboradores distintos e gerou um único evento. O disparo retornou HTTP 200, `submitted: 1`, `push_status: sent`, ticket presente e uma tentativa. Os três relatos, o usuário técnico adicional e o evento devem ser removidos especificamente após o teste, sem apagar a massa sintética inteira. Nenhum dado de produção foi alterado.
- Atualização OTA Android `preview` publicada em 07/10/2026: grupo `350d4321-a7ea-407d-bdac-d7bfd536416c`, runtime `1.0.1`. Alertas internos aparecem no topo de Atividade, o ícone mostra a contagem de não lidos e o toque em alerta interno ou push abre o posto no mapa. O EAS confirmou `Published`; a navegação no aparelho ainda depende de teste manual. Nenhum novo APK foi gerado.
- Correção da troca de contas aplicada somente em homologação: `202610070004_price_alert_device_session.sql` preserva `push_enabled` ao sair e desvincula apenas o token; a função foi conferida no banco. A OTA Android `preview` do grupo `aeae8fc3-2874-4e89-bc38-d2ee55da6230`, runtime `1.0.1`, registra novamente o aparelho ao entrar em conta que já aderiu ao push e já concedeu permissão. EAS confirmou a publicação; nenhuma alteração foi aplicada em produção.
- Atualização OTA Android `preview` de favoritos por conta publicada no grupo `50857b48-b364-4cf0-8fa4-16e66aa7475f`, runtime `1.0.1`. EAS confirmou a publicação. A troca entre duas contas e o visitante ainda precisa ser conferida no aparelho; nenhum novo APK foi gerado.
- Atualização OTA Android `preview` do grupo `d18b911c-1b03-4d8b-a00a-913fab574620`, runtime `1.0.1`, ajusta o preço cortado nos cartões de Favoritos e mostra a conta dona da lista. Após carregar essa OTA, o usuário confirmou no Android que um favorito novo da conta A não apareceu na conta B e que o preço coube no cartão. Nenhum novo APK foi gerado.
- Reenvio técnico isolado de push para o evento sintético existente `e2f4d410-34e5-48f6-9bdb-22a1acbde686`, sem criar novo preço ou evento e sem alterar os limites anti-spam: solicitação `pg_net` 5, HTTP 200, ticket Expo `01a11928-b75d-754e-b449-8cb0e2efa59f`; solicitação de recibo 6, HTTP 200, status `ok`. O usuário confirmou recebimento e que o toque abriu o posto correto no mapa.
- O envio automático de alertas foi ativado somente em homologação: `pg_cron` instalado e trabalho `botali-price-alert-dispatch-preview` (ID 1) ativo a cada 5 minutos. A fila tinha 0 pushes pendentes, 1 recibo a conferir, 1 regra externa ativa e 1 aparelho cadastrado antes da ativação. A operação é registrada em `supabase/operations/enable_price_alert_dispatch_homologation.sql`; há um script específico de desativação no mesmo diretório. A rotina destrutiva de retenção continua desligada. Produção não recebeu o agendamento.
- Primeira execução automática confirmada: `cron.job_run_details` registrou `succeeded`; o Edge Function respondeu HTTP 200 (`pg_net` 7) com 0 envios novos e 1 recibo conferido. O evento sintético permaneceu `sent`, com uma tentativa e recibo marcado como conferido. A divergência entre o relógio do ambiente local e o horário do banco não afetou a execução.
- Região: São Paulo (`sa-east-1`), igual à produção.
- EAS: ambiente e canal `preview`.
- Usa URL e chave pública próprias; segredos nunca são versionados.
- Pode receber massa artificial de 10 mil postos e 80 mil relatos para testes.

### Estado em 01/10/2026

- Projeto criado e saudável no plano gratuito.
- As 19 migrações iniciais foram aplicadas em uma única transação; as migrações do perfil comunitário e do armazenamento privado de avatares foram aplicadas separadamente, totalizando 21.
- 17 tabelas públicas com RLS habilitada.
- Busca por raio, busca pelos limites do mapa e consenso disponíveis.
- Agregados privados e rotina de retenção disponíveis; `dry-run` sem itens em banco vazio.
- Catálogo inicial com 10 combustíveis e 18 bandeiras.
- Auth configurado com URL principal e redirecionamento `botali://auth/callback`.
- Login Google habilitado com um cliente OAuth Web exclusivo para a homologação e callback do Supabase registrado no Google Cloud.
- Variáveis do Supabase separadas no EAS: `preview` usa homologação; `development` e `production` continuam na produção.
- Atualização Android publicada no canal `preview`, runtime `1.0.0`, grupo `a210b1a9-058e-4995-b718-f683247062c4`.
- Novo APK `preview` 1.0.1 (Android versionCode 2) com seleção nativa de fotos concluído no EAS: build `0601bc9b-b7d3-4465-a43a-d40e426301c7`.
- Massa sintética persistente e removível carregada: 10.000 postos, 40.000 vínculos de combustíveis, 15.334 serviços, 80.000 relatos de preço e 2 usuários técnicos sem senha ou identidade OAuth.
- Validação SQL concluída: buscas por limites e por raio retornaram no máximo 200 postos; o consenso retornou 800 combinações para uma amostra de 200 postos; retenção em `dry-run` não encontrou dados vencidos.
- Teste HTTP concluído contra a homologação: 60 fluxos completos, concorrência 5, nenhuma falha e p95 geral de 796 ms para uma meta de 2,5 segundos.
- Produção não recebeu a massa sintética. Todos os registros usam o prefixo `[SYNTH HML]`, IDs determinísticos e podem ser removidos com `supabase/test-data/remove_homologation_10k.sql`.
- Pendente: validar a experiência com a massa de volume no build `preview`.
- Backups físicos restauráveis indisponíveis no plano gratuito; procedimento de backup lógico e verificador de restauração preparados em `docs/BACKUP_RESTORE_RUNBOOK.md`.
- Histórico do Supabase CLI ausente na homologação porque as migrações iniciais foram aplicadas pelo editor SQL; o verificador registra essa condição sem confundi-la com perda de estrutura.
- Linha de base de backup validada em 30/09/2026: PostGIS e funções essenciais presentes, 17/17 tabelas públicas com RLS, 10.001 postos e 80.001 relatos de preço.
- Perfil comunitário validado em homologação: privado por padrão, resumo e atualização disponíveis somente para usuários autenticados e edição direta dos campos bloqueada.
- Avatares validados em produção e homologação: bucket privado de 2 MB, JPEG, quatro políticas por pasta do usuário e atualização indisponível para anônimos.

### Validação em 06/10/2026

- A migração `202610010002_community_levels_badges.sql` foi aplicada em homologação pelo editor SQL, em transação, com resultado de sucesso.
- Conferência posterior: as três tabelas comunitárias existem, há 5 badges no catálogo, 4 concessões automáticas, RLS ativa em `user_community_badges` e `my_community_profile()` retorna os campos de níveis.
- A migração ainda não foi aplicada em produção. A promoção continua sujeita à aprovação separada prevista nas regras de segurança abaixo.
- APK Android `preview` versão 1.0.1 (versionCode 3) concluído no EAS: build `c2d2f365-b98c-4ec3-ac91-1cf51be26efe`. O perfil `preview` usou as variáveis próprias de homologação.
- Teste visual temporário do perfil (já removido): uma única conta de homologação recebeu apresentação de nível 2 (25 pontos) por um wrapper de `my_community_profile()` e quatro badges de conquista com o motivo `Teste visual temporario em homologacao; nao representa conquista real`. O badge beta já existia; nenhuma confirmação de preço foi fabricada e nada disso foi aplicado em produção.
- Após ensaio com `ROLLBACK`, os quatro badges de teste foram removidos e a função real `my_community_profile_actual()` foi restaurada ao nome `my_community_profile()` em uma transação. Verificação posterior: nenhuma função ou concessão temporária, badge beta preservado, papel de moderador preservado. A função real retornou 22 pontos, nível 1, 2 preços validados e 1 posto aprovado para a conta de teste.
- A migração `202610060001_raise_community_badge_thresholds.sql` foi ensaiada com `ROLLBACK` e aplicada em homologação: os quatro marcos são 3 preços validados, 20 confirmações, 2 postos aprovados e 3 correções aprovadas. O programa e a descrição do badge beta permaneceram inalterados; produção ainda não recebeu essa migração.
- Ensaio transacional de pontuação com usuários e posto sintéticos: preço enviado sozinho `+0`; confirmação presencial `+1` para quem confirmou e `+5` para o autor do preço validado; aprovação do posto `+12`; aprovação da correção `+8`. O autor saiu de 0 para 25 pontos e nível 2 dentro da transação. `ROLLBACK` executado e ausência do posto de teste confirmada depois.
- Atualização OTA Android publicada no canal `preview`, ambiente `preview`, runtime `1.0.1`, grupo `c094d029-f618-43c0-9ce6-c47d5307ae48` e commit `8093f97`: o Perfil recarrega a pontuação a cada abertura. O APK `preview` de runtime `1.0.1` é compatível; nenhum novo APK foi gerado.

### Validação em 07/10/2026

- Atualização OTA Android publicada no canal `preview`, ambiente `preview`, runtime `1.0.1`, grupo `eb56ae96-1493-4a65-91ce-450a4ff52151` e commit `42d6297`: distância da busca e dos detalhes a partir da posição do motorista, cadastro local de veículo no Perfil e estimativa mínima de ida e volta. O registro foi conferido no EAS; teste no aparelho ainda pendente. Nenhum novo APK foi gerado.
- Atualização OTA Android publicada no canal `preview`, ambiente `preview`, runtime `1.0.1`, grupo `2e0a28f8-b9a9-45b4-8802-e6d01c65666a` e commit `6a50384`: veículo com vários combustíveis e consumo separado, migração local do cadastro anterior e comparação visual do custo por combustível no posto. Registro conferido no EAS; teste no aparelho ainda pendente. Nenhum novo APK foi gerado.
- Atualização OTA Android publicada no canal `preview`, ambiente `preview`, runtime `1.0.1`, grupo `609303ff-6ab1-42da-a6da-188036b93efd` e commit `5600469`: custo personalizado por 100 km e comparação de gasto mínimo de abastecimento mais deslocamento na busca e no detalhe. Registro conferido no EAS; teste no aparelho ainda pendente. Nenhum novo APK foi gerado.

## Estratégia de entrega

- Priorizar OTA para mudanças de JavaScript, estilos e imagens compatíveis com o runtime do APK instalado. Gerar novo APK quando houver alteração nativa ou mudança de runtime; manter os canais e ambientes de `preview` e `production` separados.

## Preparação do banco

1. [x] Criar o projeto com Data API habilitada, exposição automática de novas tabelas desabilitada e RLS automático habilitado.
2. [x] Aplicar todas as migrações de `supabase/migrations/` em ordem.
3. [x] Configurar autenticação, provedor Google e URLs de redirecionamento específicas da homologação.
4. [x] Cadastrar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no ambiente `preview` do EAS.
5. Executar os testes de contratos, RLS, autenticação, moderação e exclusão de conta.
6. [x] Carregar somente dados sintéticos identificáveis e removíveis.

## Validação antes do beta

1. Restaurar um backup em ambiente isolado e documentar o resultado.
2. Executar o teste ponta a ponta com pelo menos 10 mil postos.
3. Guardar snapshot de observabilidade antes e depois da carga.
4. Executar a retenção em modo `dry-run` e depois efetivamente somente em homologação.
5. Confirmar preços, atividade, moderação, agregados e anonimização após a retenção.
6. Gerar um build `preview` conectado exclusivamente à homologação.
7. Promover código e migrações para produção somente após aprovação do checklist.

## Regras de segurança

- Nunca copiar usuários reais, tokens, senhas ou coordenadas precisas para homologação.
- Nunca apontar um build `preview` para produção durante testes destrutivos.
- Não armazenar chaves em commits, documentação, logs ou capturas de tela.
- Tratar migração aplicada em produção como etapa separada e explicitamente aprovada.
