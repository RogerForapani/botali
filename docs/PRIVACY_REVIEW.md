# Revisão preliminar de privacidade — Botali

Data: 10 de outubro de 2026. Escopo: política pública, exclusão de conta, plano de retenção e fluxos relevantes do aplicativo e das migrações versionadas. Esta é uma análise técnica-jurídica preliminar, não um parecer de advogado nem uma certificação de conformidade. A operação real de fornecedores e o ambiente de produção não foram auditados nesta revisão.

## Resultado

A política identifica Roger Junio Marques Forapani como responsável, oferece contato e descreve as principais finalidades, localização, alertas, fornecedores e exclusão de conta. A revisão acrescentou os direitos do titular, esclareceu o acesso com Google, Apple e contas antigas, distinguiu permissões opcionais de dados já enviados e destacou que os prazos de retenção planejados **não são executados**. O aplicativo oferece link interno para a política e fluxo interno de exclusão; existe página externa com instrução por e-mail.

**Não considerar a política juridicamente aprovada nem liberar o beta público apenas com esta revisão.** Os pontos abaixo exigem decisão, evidência operacional ou validação profissional.

## Pendências prioritárias

1. **Retenção efetiva e backup — bloqueante para beta público.** A rotina de limpeza/anonimização está desativada até a restauração de backup em homologação. A política informa esse fato, mas a permanência além dos prazos-alvo precisa ser reduzida. Validar backup restaurável, ensaiar a rotina e só então definir/agendar prazos efetivos. Não prometer ao usuário que a exclusão de conta remove imediatamente cópias de backup sem verificar o ciclo de vida delas.
2. **Bases legais por finalidade — decisão jurídica pendente.** Manter um registro interno que associe autenticação, consulta de mapa, localização acionada pelo usuário, contribuições, moderação/antifraude, perfil, alertas, diagnóstico e dados de visitas à hipótese adequada do art. 7º da LGPD. Permissão do Android/iOS e escolha de ativar uma função não equivalem, por si, a consentimento LGPD. Se legítimo interesse for adotado para moderação/antifraude, documentar necessidade, expectativa do titular, salvaguardas e teste de balanceamento. Não inserir uma base legal especulativa na política pública.
3. **Fornecedores e transferência internacional — comprovação pendente.** Conferir região real, termos e fluxos de Google, Supabase e Expo, inclusive autenticação, mapas/geocodificação, fotos, tokens e push. Documentar operadores, suboperadores, eventual transferência internacional e mecanismo jurídico aplicável antes da publicação. O texto atual identifica fornecedores, mas não permite afirmar onde cada dado é processado nem qual garantia de transferência foi contratada.
4. **Exclusão via e-mail — fluxo operacional não validado.** A página externa permite iniciar o pedido sem o app, como exige o Google Play, mas ainda é preciso testar recebimento, verificação proporcional de titularidade, execução da remoção no Supabase/Storage e resposta ao solicitante. Não pedir senha ou documentos desnecessários. Registrar evidência do teste e verificar dados associados após a exclusão. A exclusão no app foi testada com conta descartável; isso não comprova o atendimento por e-mail.
5. **Declarações da Google Play — não preenchidas nesta revisão.** Comparar a seção “Segurança dos dados” com a política e com o APK final, inclusive dados acessados por SDKs, localização em primeiro plano, fotos, dados de conta e notificações. Confirmar que as URLs de política e exclusão funcionam publicamente, e que o nome do desenvolvedor na loja corresponde ao responsável indicado.
6. **Público etário e abrangência — decisão de produto pendente.** Definir se o app será direcionado a menores e em quais países será distribuído. Caso crianças ou adolescentes integrem o público-alvo, avaliar obrigações específicas da LGPD e da loja; não presumir que o login Google verifica idade. Se houver distribuição fora do Brasil, revisar legislação local aplicável.
7. **Atendimento aos direitos — procedimento pendente.** Organizar caixa de suporte, responsável por resposta e método de registrar solicitação, verificação e conclusão sem guardar dados excessivos. A LGPD prevê acesso/confirmação e uma declaração completa em até 15 dias quando solicitada; outras solicitações devem ser avaliadas conforme a norma aplicável. Preparar respostas para acesso, correção, portabilidade, oposição e exclusão, inclusive quando houver razão legítima para conservação.

## Evidência consultada no projeto

- `docs/PRIVACY_POLICY.md`, `docs/ACCOUNT_DELETION.md` e `docs/DATA_RETENTION_POLICY.md`.
- `apps/mobile/src/components/AuthModal.tsx`: link para a política, saída e exclusão da conta.
- `apps/mobile/src/services/accountDeletion.ts`: remoção da foto antes da chamada de exclusão.
- `supabase/migrations/202609100003_account_deletion.sql`: função protegida `delete_my_account` e efeitos das chaves estrangeiras.
- `apps/mobile/app.config.js`: localização em segundo plano bloqueada no novo APK Android.

## Fontes oficiais

- [LGPD, especialmente arts. 7º, 9º, 16, 18, 19 e 33](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).
- [ANPD — guia de legítimo interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse).
- [Google Play — dados do usuário e política de privacidade](https://support.google.com/googleplay/android-developer/answer/10144311?hl=pt-BR).
- [Google Play — exclusão de conta](https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR).
