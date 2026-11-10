# Encaminhamento para revisão jurídica do beta Botali

Preparado em 09/11/2026 para revisão por profissional habilitado. Este documento organiza fatos e perguntas; **não é parecer jurídico nem aprovação de lançamento**.

## Escopo da decisão

- Primeiro beta: aplicativo Android para motoristas adultos no Brasil. Consulta como visitante; conta Google para contribuições e alertas. iOS e outros países ficam fora deste escopo.
- Responsável pelo tratamento indicado na política: Roger Junio Marques Forapani, pessoa física. Contato de privacidade: rogerforapani@gmail.com.
- Fontes para a revisão: [política pública](PRIVACY_POLICY.md), [registro de finalidades e fornecedores](PRIVACY_BETA_WORKSHEET.md), [retenção planejada](DATA_RETENTION_POLICY.md), [roteiro de direitos](PRIVACY_REQUESTS_RUNBOOK.md) e [pedido externo de exclusão](ACCOUNT_DELETION.md).

## Decisões solicitadas ao revisor

1. Validar ou corrigir a hipótese legal por finalidade no registro de tratamento: conta; consulta e localização; contribuições; moderação; visitas e confirmação presencial; perfil e foto; alertas e push; diagnóstico e segurança; atendimento de direitos; backup. Documentar teste de balanceamento caso seja adotado legítimo interesse.
2. Confirmar transparência, necessidade e prazo de retenção para localização precisa transitória, área aproximada do alerta, dados de contribuição, moderação, identificação do usuário e logs técnicos dos fornecedores. Conferir se o texto público descreve o pacote Android final.
3. Definir mecanismo e documentos necessários para transferências internacionais, especialmente a cópia criptografada no Backblaze B2 **US East (Reston, EUA)**. O banco principal de homologação foi visto no painel em **São Paulo**; isso não resolve fluxos de Google, Expo, Supabase Auth/suboperadores nem suporte via Gmail. Conferir DPAs e contratos efetivamente aplicáveis, inclusive o regulamento e as cláusulas da [ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).
4. Aprovar prazo de expurgo das cópias locais e externas, o tratamento de contas excluídas que ainda constam de backups anteriores e exceções de preservação. Hoje **não há expurgo automático**. O backup manual de 09/11 passou; a primeira execução agendada seguinte ainda não foi observada. Uma política proposta deve preservar ao menos uma cópia íntegra e restaurável durante a rotação e provar, por inventário, que as cópias vencidas saíram dos dois destinos.
5. Revisar atendimento a acesso, correção, oposição, portabilidade e eliminação, inclusive autenticação do solicitante, prazo de resposta, conteúdo da resposta, guarda mínima do atendimento e dados anonimizados preservados. Houve apenas um ensaio de exclusão de conta descartável na homologação.
6. Revisar a classificação do público, as URLs públicas, os termos do serviço e a coerência entre política, aplicativo e respostas de Segurança dos Dados da Google Play. A declaração da loja depende de auditoria do **AAB final e seus SDKs**.

## Evidência técnica disponível

- A versão configurada no código desabilita localização de segundo plano no Android; a permissão efetiva ainda precisa ser confirmada no AAB final. Localização em primeiro plano é solicitada durante ações do usuário.
- Veículo e favoritos ficam no armazenamento local por conta. A foto escolhida da galeria vai ao Storage privado do Supabase; token opcional de push vai ao fluxo de alertas.
- A restauração isolada de uma cópia externa foi ensaiada para banco, arquivo sintético e consulta de visitante. O teste autenticado desse ensaio foi dispensado pelo responsável. A retenção efetiva e o descarte de backup não foram ativados.

## Registro da conclusão profissional

Preencher fora deste repositório ou em documento versionado sem dados sensíveis: nome e qualificação do revisor, data, versão dos documentos e do AAB, decisões por item, ressalvas, texto aprovado e evidência contratual. Até esse registro existir, marcar a revisão jurídica como **pendente**.
