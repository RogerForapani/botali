# Preparação da declaração Segurança dos Dados da Google Play

Atualizado em 09/11/2026. Rascunho para o **beta Android destinado a adultos no Brasil**. **Não enviado à Play Console.** A [instrução oficial](https://support.google.com/googleplay/android-developer/answer/10787469) exige considerar os SDKs, dados coletados ou compartilhados, finalidade, obrigatoriedade, segurança e exclusão. Um beta em faixa fechada também precisa da declaração; conferir a exceção apenas se a distribuição ficar exclusivamente na faixa interna.

Este quadro descreve o código presente na branch de preparação. A declaração só pode ser fechada com o AAB que será distribuído, seus manifestos, dependências e documentação dos fornecedores. “Coletado” e “compartilhado” aqui são **pontos de investigação**, não respostas definitivas do formulário.

| Categoria a conferir na Play Console | Fluxo identificado | Finalidade e escolha do usuário | Evidência / conferência antes de declarar |
| --- | --- | --- | --- |
| Informações pessoais: nome, e-mail e IDs de usuário | Login Google e Supabase Auth, perfil comunitário, autoria e moderação | A conta é opcional para ler o mapa e necessária para contribuições | `src/lib/supabase.ts`, `src/components/AuthModal.tsx`; conferir atributos realmente recebidos do Google e enviados aos SDKs |
| Localização precisa | Posição solicitada para mostrar distância, cadastrar/corrigir coordenada de posto e confirmar preço no local | Acesso em primeiro plano, após ação do usuário; cada função pode ser recusada | `NewStationModal.tsx`, `EditStationModal.tsx`, `services/stations.ts`; auditar permissões e chamadas do Maps SDK no AAB final |
| Localização aproximada | Centro da área do alerta é arredondado; busca de postos envia área/coordenadas ao Supabase | Busca faz parte da função principal; alerta é opcional | `PriceAlertCard.tsx`, `services/priceAlerts.ts`, `services/stations.ts`; conferir definição da categoria e precisão real transmitida |
| Fotos | Imagem escolhida na galeria para avatar e enviada ao bucket privado | Opcional, escolhida pelo usuário | `CommunityProfileCard.tsx`, `services/communityProfile.ts`; verificar permissões e SDK de seleção no AAB |
| Atividade no app e conteúdo criado | Preços, confirmações, postos, correções, avaliações e histórico comunitário | Envio exige conta; consulta pode ser feita como visitante | `services/stations.ts` e funções PostgreSQL; mapear visibilidade e categorias precisas do formulário |
| IDs do dispositivo ou outros identificadores | Token Expo de push é registrado apenas quando o alerta externo é ativado; SDKs podem tratar outros identificadores | Push externo opcional | `services/priceAlerts.ts`, `expo-notifications`, FCM; obter declarações dos SDKs e identificar todos os destinos |
| Informações e desempenho do app | Diagnóstico sanitizado e métricas agregadas ficam no aparelho, com compartilhamento manual | Compartilhamento explícito | `services/diagnostics.ts`, `AuthModal.tsx`; verificar logs ou telemetria automática de Expo, Maps, Supabase e outros SDKs |
| Dados financeiros/veículo | Tipo, marca, modelo, ano e consumo do veículo ficam no armazenamento local; o app calcula estimativa de custo | Cadastro opcional | `services/vehicle.ts`; conferir se nenhum SDK ou diagnóstico transmite esses campos e se se enquadram em categoria da loja |
| Favoritos e resultado em cache | Favoritos separados por conta e último resultado de postos ficam no aparelho | Funções de conveniência | `services/favorites.ts`, `services/stationCache.ts`; não declarar transmissão ao servidor sem evidência |

## Perguntas do formulário que continuam abertas

- Quais dados cada SDK integrado coleta ou compartilha automaticamente, mesmo sem ação explícita na interface? Conferir Maps SDK, Google Sign-In/OAuth, FCM, Expo Updates/Push, Supabase e bibliotecas do AAB.
- Quais transmissões são criptografadas em trânsito e como isso foi verificado para **todos** os destinos? Não marcar “sim” com base em um único endpoint HTTPS.
- Para cada categoria, a coleta é obrigatória para usar o aplicativo ou opcional para a função específica? Distinguir leitura como visitante de contribuição autenticada.
- Há compartilhamento segundo a definição específica da Play Console, inclusive processamento por terceiros e exceções aplicáveis? Não inferir “não compartilhado” apenas porque os fornecedores atuam sob contrato.
- A solicitação de exclusão pode ser iniciada no app e por URL pública? Confirmar no pacote final e na página pública. Documentar que arquivos de backup anteriores não são apagados imediatamente e ainda aguardam prazo de expurgo.
- Há publicidade, identificadores de anúncios ou outros componentes adicionados na compilação final? Conferir o AAB em vez de presumir ausência.

## Fechamento antes do envio

1. Gerar o AAB do beta e listar manifesto, permissões e SDKs presentes.
2. Conferir a documentação de Segurança dos Dados de cada SDK e registrar versão e link consultado.
3. Testar como visitante, com login, foto, localização e push, observando os destinos de dados; comparar com a política.
4. Revisar cada resposta com o responsável e a revisão jurídica. Só então preencher e enviar a declaração na Play Console.
