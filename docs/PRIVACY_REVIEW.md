# Revisão preliminar de privacidade — Botali

Data: 10 de outubro de 2026. Escopo: política pública, exclusão de conta, plano de retenção e fluxos relevantes do aplicativo e das migrações versionadas. Esta é uma análise técnica-jurídica preliminar, não um parecer de advogado nem uma certificação de conformidade. A operação real de fornecedores e o ambiente de produção não foram auditados nesta revisão.

## Resultado

A política identifica Roger Junio Marques Forapani como responsável, oferece contato e descreve as principais finalidades, localização, alertas, fornecedores e exclusão de conta. A revisão acrescentou os direitos do titular, esclareceu o acesso com Google, Apple e contas antigas, distinguiu permissões opcionais de dados já enviados e destacou que os prazos de retenção planejados **não são executados**. O aplicativo oferece link interno para a política e fluxo interno de exclusão; existe página externa com instrução por e-mail.

**Não considerar a política juridicamente aprovada nem liberar o beta público apenas com esta revisão.** Os pontos abaixo exigem decisão, evidência operacional ou validação profissional.

**Atualização operacional de 09/11/2026:** uma cópia externa criptografada foi restaurada em PostgreSQL local e em projeto Supabase isolado; banco, arquivo sintético do Storage e consulta como visitante passaram. O teste autenticado deste ensaio foi dispensado pelo responsável, e a retenção permanente não foi executada. A execução manual de backup de 09/11 concluiu após uma interrupção anterior; a próxima execução agendada ainda precisa ser observada. Esta evidência reduz a pendência técnica do item 1, mas não encerra a revisão jurídica nem comprova recuperação completa do serviço.

O responsável definiu o primeiro beta para **motoristas adultos no Brasil**, sem conteúdo dirigido a crianças. O [inventário de preparação do beta](PRIVACY_BETA_WORKSHEET.md) registra finalidades, hipóteses legais candidatas, fornecedores, transferências e categorias a conferir no AAB antes de preencher a Play Console. Nenhuma hipótese foi aprovada juridicamente apenas por esse inventário.

As páginas públicas de [política de privacidade](https://github.com/RogerForapani/botali/blob/main/docs/PRIVACY_POLICY.md) e [pedido de exclusão](https://github.com/RogerForapani/botali/blob/main/docs/ACCOUNT_DELETION.md) abriram sem login em 09/11/2026. No mesmo dia, o fluxo externo de exclusão passou com conta descartável **somente na homologação**: pedido recebido na caixa de suporte, remetente comparado a um único usuário comum, ausência de foto no Storage, conta removida, vínculos consultados zerados e resposta enviada. O registro com identificador ficou fora do Git. Esse ensaio não substitui a conferência do caminho no ambiente e pacote finais.

## Pendências prioritárias

1. **Retenção efetiva e backup — bloqueante para beta público.** A cópia externa foi restaurada em um projeto isolado, com leitura de visitante aprovada; o teste autenticado foi dispensado e a rotina de limpeza/anonimização continua desativada. A permanência além dos prazos-alvo precisa ser reduzida. Definir, ensaiar e conferir a rotina antes de agendá-la ou afirmar que os prazos são cumpridos. Não prometer ao usuário que a exclusão de conta remove imediatamente cópias de backup sem verificar o ciclo de vida delas.
2. **Bases legais por finalidade — decisão jurídica pendente.** O registro de finalidades e hipóteses candidatas está em `PRIVACY_BETA_WORKSHEET.md`; requer revisão profissional e decisão documentada. Permissão do Android/iOS e escolha de ativar uma função não equivalem, por si, a consentimento LGPD. Se legítimo interesse for adotado, documentar o teste de balanceamento. Não inserir uma base legal especulativa na política pública.
3. **Fornecedores e transferência internacional — comprovação pendente.** O inventário agora inclui Google, Supabase, Expo, Backblaze B2 e Gmail. Conferir regiões reais, contratos e fluxos do APK final, operadores/suboperadores e mecanismo jurídico aplicável antes da publicação. O texto atual não comprova onde cada dado é processado nem qual garantia de transferência foi contratada.
4. **Exclusão via e-mail — ensaio de homologação concluído.** Recebimento, titularidade, remoção e resposta passaram em 09/11/2026 com conta descartável. Repetir a conferência das URLs e do fluxo no ambiente final. Não pedir senha ou documentos desnecessários.
5. **Declarações da Google Play — não preenchidas nesta revisão.** Comparar a seção “Segurança dos dados” com a política e com o APK final, inclusive dados acessados por SDKs, localização em primeiro plano, fotos, dados de conta e notificações. Confirmar que as URLs de política e exclusão funcionam publicamente, e que o nome do desenvolvedor na loja corresponde ao responsável indicado.
6. **Público etário e abrangência — decisão tomada para este beta.** Motoristas adultos no Brasil; registrar a faixa adequada e o país na Play Console. Não presumir que o login Google verifica idade. Se menores ou outros países entrarem no escopo, refazer a revisão.
7. **Atendimento aos direitos — procedimento parcial.** A caixa de suporte e o roteiro de exclusão por e-mail foram ensaiados. O [roteiro geral de atendimento](PRIVACY_REQUESTS_RUNBOOK.md) cobre acesso, correção, portabilidade e oposição, mas falta ensaiá-lo e definir o prazo de conservação dos registros. A LGPD/ANPD indica atendimento imediato para confirmação/acesso simples e até 15 dias para a declaração completa; os demais pedidos exigem avaliação específica.

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
