# Preparação de privacidade para o beta Android

Atualizado em 09/11/2026. Este é um inventário de trabalho para o responsável e para revisão jurídica. As hipóteses legais abaixo são **candidatas**, não conclusões jurídicas nem declarações já publicadas. Conferir o APK/AAB final e os contratos efetivamente aceitos antes de preencher a Play Console.

## Decisão de produto

- Público pretendido no primeiro beta: **motoristas adultos**, sem conteúdo ou recursos dirigidos a crianças.
- Distribuição pretendida no primeiro beta: **Brasil**. Selecionar a faixa etária correspondente no questionário da Play Console e conferir se a apresentação visual e os textos são coerentes com ela. O login Google não verifica idade.
- O iOS e outros países ficam fora desta rodada; qualquer expansão exige nova revisão.

## Registro de finalidades e hipótese a decidir

| Finalidade e dados | Tratamento observado | Hipótese candidata para revisão jurídica | Decisão/evidência pendente |
| --- | --- | --- | --- |
| Conta e autenticação: ID, nome e e-mail fornecidos pelo Google; contas legadas por senha | Supabase Auth; visitante consulta sem conta | Execução de contrato/procedimentos a pedido do titular (LGPD, art. 7º, V) | Confirmar termos da relação com o usuário, dados recebidos do provedor e permanência do acesso legado |
| Mapa e busca geográfica | Área do mapa e coordenadas enviadas para busca; posição precisa acessada após ação do usuário | Execução do serviço solicitado (art. 7º, V), a confirmar | Mapear exatamente quais chamadas alcançam Supabase e Google Maps; permissão do Android não é, por si, consentimento LGPD |
| Cadastro, preço, correção, avaliação e reputação | Contribuições vinculadas à conta, conteúdo do posto publicado após moderação | Execução do serviço (art. 7º, V) para a contribuição; eventual legítimo interesse (art. 7º, IX) para integridade e antifraude | Separar as operações, minimizar campos e documentar teste de balanceamento antes de usar legítimo interesse |
| Confirmação presencial e visitas | Coordenada precisa processada transitoriamente; posto/dia/distância aproximada registrados | Execução do recurso solicitado (art. 7º, V), a confirmar | Verificar necessidade, frequência, transparência e retenção efetiva; localização de fundo está adiada |
| Perfil e foto opcionais | Nome público, visibilidade e foto escolhida da galeria; foto no Storage privado | Execução da personalização pedida pelo titular (art. 7º, V), a confirmar | Conferir exclusão e visibilidade no build final |
| Alerta interno e push opcional | Regra de preço, área arredondada, evento e token do aparelho para push externo | Execução do recurso solicitado (art. 7º, V), a confirmar | Distinguir escolha de receber push, permissão do sistema e hipótese legal; conferir desvinculação do token |
| Diagnóstico e segurança | Falhas sanitizadas no aparelho; compartilhamento manual; registros técnicos dos fornecedores | Execução do serviço e/ou legítimo interesse para segurança, conforme cada operação | Inventariar logs dos fornecedores e fazer teste de balanceamento se adotado legítimo interesse |
| Atendimento de direitos | E-mail enviado pelo titular, resposta e registro mínimo do pedido | Cumprimento de obrigação legal/regulatória e exercício de direitos, conforme avaliação jurídica | Definir prazo operacional, acesso restrito e descarte do registro de atendimento |
| Backup e recuperação | Cópia criptografada do banco e Storage em computador e Backblaze B2 | Segurança e continuidade do serviço; hipótese a definir com jurídico | Formalizar prazo das cópias, chave, região, acesso e exclusão ao fim do ciclo |

Não escolher consentimento apenas porque uma função é opcional. Se legítimo interesse for escolhido para moderação, segurança ou diagnóstico, registrar finalidade, necessidade, expectativa do titular, riscos e salvaguardas antes da publicação. [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm); [guia da ANPD sobre legítimo interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse).

## Fornecedores e transferência internacional

| Serviço | Uso no Botali | O que falta confirmar para o lançamento |
| --- | --- | --- |
| Supabase | Auth, PostgreSQL/PostGIS, Data API, fotos privadas, alertas | Região do projeto atendido pelo APK final, DPA/termos aplicáveis, suboperadores e fluxos fora da região primária. A região escolhida não prova, sozinha, conformidade. [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum); [regiões](https://supabase.com/docs/guides/platform/regions) |
| Google | Login, Maps SDK Android e entrega Android via FCM | Dados acessados por cada SDK, termos aplicáveis, locais de processamento e restrições da chave do APK final. [Políticas do Maps SDK](https://developers.google.com/maps/documentation/android-sdk/policies) |
| Expo | Build/OTA e, se ativado pelo usuário, serviço de push com token e conteúdo do alerta | Contrato aplicável, suboperadores, locais e payload real enviado. [Suboperadores](https://expo.dev/privacy/subprocessors); [payload de push](https://docs.expo.dev/push-notifications/sending-notifications/) |
| Backblaze B2 | Guarda externa do backup criptografado | Região real da conta/bucket, DPA aplicável, prazo de retenção e rotina de restauração/exclusão. [Regiões B2](https://www.backblaze.com/docs/cloud-storage-data-regions); [DPA](https://help.backblaze.com/hc/en-us/articles/360004146953-Data-Processing-Addendum) |
| Google Gmail | Canal de suporte e pedidos de privacidade | Definir acesso à caixa, registro mínimo e descarte; conferir contrato e configuração da conta utilizada |

Um fornecedor sediado fora do Brasil ou um fluxo internacional exige análise do mecanismo de transferência aplicável. Não afirmar que a hospedagem em São Paulo mantém todos os dados no Brasil. [Regulamento da ANPD sobre transferência internacional](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).

**Verificação operacional de 09/11/2026:** o painel do projeto de homologação Supabase `phsvoeljsaksglqrpstm` mostra **South America (São Paulo)**. A configuração local do destino externo do backup aponta para `us-east-005` do Backblaze B2; segundo a [documentação de regiões da Backblaze](https://www.backblaze.com/docs/cloud-storage-data-regions), a região US East guarda os arquivos em Reston, Virgínia, EUA. Trata-se de cópia criptografada fora do Brasil. Esta conferência não prova onde os demais serviços, logs e suboperadores processam dados nem valida um mecanismo jurídico de transferência. O material de contratos e transferências deve ser fechado por revisão jurídica antes do beta público.

## Rascunho para “Segurança dos dados” na Play Console

Este quadro **não é um formulário aprovado**. “Coletado” e “compartilhado” têm definições próprias do Google Play, inclusive para SDKs e processamento transitório. Preencher somente após examinar o AAB final e as declarações dos SDKs. [Guia oficial](https://support.google.com/googleplay/android-developer/answer/10787469).

| Categoria a conferir | Fluxo identificado | Estado para o formulário |
| --- | --- | --- |
| Nome, e-mail e ID de usuário | Login Google/Supabase; perfil e moderação | Coleta provável para conta; verificar compartilhamento e finalidades por fornecedor |
| Localização precisa | “Minha posição”, cadastro de posto e confirmação presencial após ação | Declarar a transmissão/processamento mesmo se efêmero; conferir uso do Maps SDK e ausência de acesso em segundo plano no AAB |
| Localização aproximada | Área arredondada de alerta e busca de postos | Verificar se se enquadra na categoria da loja e se é opcional |
| Fotos | Avatar escolhido da galeria, enviado ao bucket privado | Coleta opcional; não confundir com fotos do aparelho não selecionadas |
| Conteúdo criado pelo usuário | Preços, postos, avaliações e correções | Mapear categorias de conteúdo e visibilidade; conferir moderação e retenção |
| Identificadores do dispositivo | Token para push externo opcional; possíveis identificadores dos SDKs | Conferir SDKs e finalidades no pacote final; não presumir ausência de coleta |
| Diagnóstico e atividade | Diagnóstico local compartilhado manualmente; telemetria técnica de SDKs | Conferir se há transmissão automática por algum SDK |
| Veículo e favoritos | Armazenamento local separado por conta | Não marcar como enviados ao servidor sem evidência no build final |

Respostas ainda pendentes no formulário: criptografia em trânsito de **todos** os fluxos, possibilidade de exclusão, uso de dados por SDKs, categorias de compartilhamento, coleta opcional/obrigatória e declaração de anúncios. Conferir o [caminho externo de exclusão](ACCOUNT_DELETION.md) e a [política pública](PRIVACY_POLICY.md) com URLs acessíveis sem login. A confirmação por e-mail foi ensaiada em homologação em 09/11; o pacote final ainda precisa ser testado.

O [rascunho operacional da declaração para Google Play](PLAY_DATA_SAFETY_DRAFT.md) detalha cada fluxo identificado no código, a evidência e o ponto que precisa ser confirmado no AAB final. Não copiar respostas provisórias diretamente para a loja.

## Portões restantes deste passo

1. Responsável e profissional jurídico revisarem as bases por finalidade, o atendimento aos direitos, a retenção e as transferências; registrar versão e decisões.
2. Conferir contratos/DPAs efetivamente aplicáveis e a região configurada de Supabase e Backblaze, sem colocar credenciais no repositório.
3. Implantar e testar o ciclo de 30 dias aprovado em 11/11 para cópias externas e locais e a retenção efetiva dos dados antes de prometer prazos como executados. Uma execução única agendada em 11/11 passou; o horário diário das 10h ainda precisa ser observado em um dia com o computador ligado.
4. Inspecionar o AAB final e os dados de SDKs; então transcrever as respostas para a Play Console, conferir URLs públicas e revisar o texto da loja.

O [pacote de revisão jurídica](LEGAL_REVIEW_BRIEF.md) reúne as decisões que exigem análise profissional. O prazo de 30 dias foi aprovado pelo responsável. O descarte externo foi ativado com proteções para duas cópias recentes e backup recém-conferido, após ensaio com amostra descartável; a primeira cópia real vencida e as pastas locais ainda não foram expurgadas e conferidas.

Esta preparação não autoriza limpeza automática, publicação na loja ou declaração de conformidade jurídica.
