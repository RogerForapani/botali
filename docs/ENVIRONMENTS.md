# Ambientes do Botali

## Produção

- Supabase atual: `preco-na-bomba`.
- EAS: ambiente e canal `production`.
- Não recebe dados demonstrativos, ensaios destrutivos ou migrações sem validação prévia.
- A rotina efetiva de retenção permanece sem agendamento até a restauração de backup ser comprovada.

## Homologação

- Supabase: `botali-homologacao` (`phsvoeljsaksglqrpstm`).
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
- Teste visual temporário do perfil: uma única conta de homologação recebe apresentação de nível 2 (25 pontos) por um wrapper de `my_community_profile()`; a função original foi preservada como `my_community_profile_actual()`. Quatro badges de conquista foram concedidos com o motivo `Teste visual temporario em homologacao; nao representa conquista real`; o badge beta já existia. Nenhuma confirmação de preço foi fabricada e nenhuma dessas alterações foi aplicada em produção.
- Antes de validar a pontuação real nessa conta de teste ou promover o recurso: remover apenas os quatro registros com esse motivo de teste, descartar o wrapper e renomear `my_community_profile_actual()` de volta para `my_community_profile()` em uma única transação. Não copiar o wrapper para produção.
- A migração `202610060001_raise_community_badge_thresholds.sql` foi ensaiada com `ROLLBACK` e aplicada em homologação: os quatro marcos são 3 preços validados, 20 confirmações, 2 postos aprovados e 3 correções aprovadas. O programa e a descrição do badge beta permaneceram inalterados; produção ainda não recebeu essa migração.
- Ensaio transacional de pontuação com usuários e posto sintéticos: preço enviado sozinho `+0`; confirmação presencial `+1` para quem confirmou e `+5` para o autor do preço validado; aprovação do posto `+12`; aprovação da correção `+8`. O autor saiu de 0 para 25 pontos e nível 2 dentro da transação. `ROLLBACK` executado e ausência do posto de teste confirmada depois.

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
