# Revisão jurídica preliminar do beta Android Botali

Data: 11/11/2026. Escopo: motoristas adultos no Brasil, com base no código e documentos versionados nesta branch. Esta é uma análise de riscos e correções para decisão do responsável e revisão por advogado habilitado; não é parecer profissional nem declaração de conformidade.

## Parecer preliminar

**Ainda não há base documental suficiente para publicar o beta aberto ao público.** O app tem política acessível, responsável e contato identificados, exclusão interna e por e-mail ensaiada, localização de fundo desabilitada na configuração Android e backup externo restaurado em teste isolado. Os riscos pendentes abaixo são concretos e verificáveis.

| Prioridade | Achado | Correção e evidência necessária |
| --- | --- | --- |
| Alta | Hipóteses legais por finalidade são apenas candidatas. Permissão de localização, foto ou push no Android não substitui a escolha da base legal. | Aprovar uma base por operação no inventário; separar autenticação, busca geográfica, contribuição, moderação, segurança, alertas, atendimento de direitos e backup. Se houver legítimo interesse, documentar balanceamento e salvaguardas. |
| Alta | Backup criptografado é enviado ao B2 US East, nos EUA; o banco de homologação aparece em São Paulo. Não foi comprovado o mecanismo de transferência internacional para Backblaze e demais fluxos de fornecedores. | Conferir contratos e suboperadores aplicáveis, escolher e documentar mecanismo do art. 33 da LGPD/Resolução ANPD 19/2024 e adequar a informação ao titular. Criptografia reduz o risco, mas não dispensa a análise da transferência. |
| Alta | A retenção de dados do banco permanece planejada; o prazo de 30 dias do backup foi aprovado agora, mas a remoção de uma cópia real vencida ainda não foi observada. A rotina externa foi ensaiada com amostra descartável e encontrou 9 backups recentes. | Registrar a primeira eliminação real e ausência de versões ocultas, revisar as pastas locais, implantar/ensaiar a retenção do banco em homologação e documentar suspensão do expurgo em caso de falha de backup. |
| Média | A política descreve cópias anteriores à exclusão de conta, mas a resposta operacional ao titular deve explicar que elas permanecem até seu vencimento e que uma restauração não pode reativar dados excluídos. | Incluir etapa obrigatória de reaplicação de exclusões após restauração e registro mínimo dos pedidos; conferir o prazo de atendimento e exceções de conservação com advogado. |
| Média | Veículo e favoritos ficam no aparelho, sem criptografia própria. A exclusão por e-mail não apaga dados locais do aparelho. | Confirmar a explicação ao usuário e testar a exclusão no AAB final; avaliar proteção local adequada para dados de conta/sessão e limpeza na troca de conta. |
| Média | A declaração de Segurança dos Dados depende do AAB final e dos SDKs integrados; um APK de teste não prova os dados transmitidos pela versão da loja. | Auditar manifesto, versões de SDK, fluxos de Maps, Google, Expo e Supabase, além das URLs de política e exclusão, antes de preencher a Play Console. |
| Média | O beta é dirigido a adultos, porém login Google não valida idade. | Configurar público adulto e país Brasil na loja, manter linguagem e apresentação coerentes e prever resposta se houver relato de menor de idade. |

## Ajustes de texto e operação

1. Manter na política a distinção entre retenção **planejada** e **executada**. O prazo de backup é de 30 dias por decisão do responsável, mas não afirmar que todas as cópias vencidas já foram apagadas.
2. Registrar o fornecedor e a região do backup sem sugerir que todos os demais serviços ficam no Brasil. A política já informa US East; o mecanismo jurídico de transferência ainda precisa ser definido.
3. Ao responder a exclusões, informar o que saiu do banco ativo, o que pode permanecer anonimizado e o prazo dos backups. Não afirmar eliminação imediata de todas as cópias.
4. Conferir o nome do responsável, endereço de contato e URLs públicas na página da loja; revisar a política contra o AAB candidato, que usa versão de configuração 1.0.5.

## Decisão para o lançamento

O responsável pode continuar testes internos e preparar o AAB. Antes de abrir o beta ao público, obter revisão jurídica assinada ou documentada das bases legais, transferências, retenção e textos; comprovar o descarte efetivo, a operação da rotina de direitos e a declaração da Play Store com o AAB final.

## Fontes oficiais consultadas

- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), especialmente arts. 6º, 7º, 16, 18, 19 e 33.
- [ANPD: regulamento de transferência internacional e cláusulas padrão](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).
- [Google Play: requisitos de Segurança dos Dados e SDKs](https://support.google.com/googleplay/android-developer/answer/10787469).
