# Regras de negócio

## Acesso

- Consulta ao mapa e aos postos não exige login.
- Login é solicitado somente ao contribuir, cadastrar ou corrigir dados.

## Preços comunitários

- Foto é opcional.
- Um preço deve ser apresentado com combustível, valor, confiança, confirmações e data de atualização.
- A interface nunca deve apresentar confiança somente por cor.
- Faixas iniciais: alta de 90 a 100; boa de 70 a 89; média de 40 a 69; baixa de 0 a 39.

## Comparação para veículos flex

- Quando gasolina e etanol estiverem disponíveis no mesmo posto, calcule `etanol ÷ gasolina × 100`.
- A referência inicial configurada é 70%: até esse valor, o etanol é indicado como favorável; acima dele, a gasolina tende a compensar.
- O percentual é uma referência de preço, não uma garantia de consumo ou economia para todos os veículos.

## Níveis comunitários

- O nível reconhece contribuições úteis e não altera confiança, moderação ou peso no consenso de preços.
- Cada preço confirmado por outra pessoa vale 5 pontos; confirmação presencial vale 1 ponto, limitada a 50 pontos; posto aprovado vale 12 pontos; correção aprovada vale 8 pontos.
- Envios ainda não validados não geram pontos.
- Níveis: Explorador (0), Colaborador (25), Parceiro da Estrada (75), Referência Local (180) e Guardião Botali (400).
- Badges de conquistas comuns são derivados dos dados validados. O badge Pioneiro do Beta é permanente, concedido pelo servidor e mantém data e motivo da concessão.
- Marcos das quatro conquistas comuns: 3 preços confirmados por outras pessoas, 20 confirmações de preço, 2 postos aprovados e 3 correções de posto aprovadas. O badge beta e o identificador de moderador não dependem desses marcos.
- Se faltar um dos preços, não mostre a comparação.
- No mapa, o preço escolhido continua sendo a informação principal; a relação flex aparece como informação secundária compacta.

## Recarga elétrica

- O modo de recarga do mapa mostra apenas postos que tenham esse serviço confirmado.
- Recarga elétrica é um serviço do posto e não deve ser tratada como tipo de combustível líquido.

## Veículo e deslocamento

- Tipo, marca, modelo e ano identificam o veículo; só combustível e consumo médio em km/L são necessários para a estimativa. Não pedir placa.
- A distância exibida na busca e no detalhe do posto parte da última posição obtida por ação do motorista. Sem essa posição, indicar distância indisponível em vez de mostrar a distância do centro do mapa.
- A primeira estimativa de ida e volta usa `2 × distância em linha reta ÷ consumo médio × preço do combustível` e deve ser rotulada como mínima aproximada. Não apresentá-la como custo real da rota nem como economia líquida.
- A posição precisa expira da memória após cinco minutos; o motorista pode atualizá-la quando quiser. Não salvar essa posição no perfil do veículo.

## Postos

- Novos cadastros entram como `pending`.
- Um posto `pending` fica visível somente para quem o cadastrou e para moderadores; a consulta pública mostra apenas postos `verified`.
- Cadastro deve usar coordenadas válidas, obtidas pelo GPS ou pela conversão explícita do endereço informado. O usuário não precisa estar fisicamente no posto.
- Postos diferentes podem coexistir próximos. O bloqueio de duplicidade do MVP ocorre somente quando já existe um posto com o mesmo nome normalizado em um raio de 100 metros.
- Ao aprovar um posto, os serviços relatados no mesmo cadastro também passam a `confirmed`; na rejeição, passam a `rejected`.
- Um usuário não altera diretamente um posto publicado: ele envia uma sugestão com o retrato anterior e os novos dados.
- Cada usuário pode manter somente uma correção pendente por posto; uma nova sugestão só é aceita após a anterior ser resolvida.
- Correções são aplicadas apenas após revisão de moderador. Aprovação e rejeição ficam registradas em uma trilha de auditoria.
- A edição de endereço pode propor novas coordenadas. O ponto do posto no mapa só muda após aprovação do moderador, que deve ver a posição anterior, a nova posição e a distância aproximada do deslocamento.
- A tela de revisão deve mostrar claramente os dados anteriores e os propostos antes da decisão.

## Confiança e reputação

- Confirmações recentes e contribuições consistentes aumentam confiança.
- Divergências, dados antigos e correções reduzem confiança.
- Evoluções do algoritmo devem ser documentadas e auditáveis antes de alterar os limites oficiais.
- O preço comunitário considera relatos dos últimos 5 dias agrupados pelo mesmo valor em centavos.
- Quando não houver relato nos últimos 5 dias, o último preço conhecido continua visível, com confiança baixa e aviso explícito de que está desatualizado.
- Cada usuário contribui no máximo com um relato por posto e combustível dentro da janela de consenso; um novo envio substitui o relato anterior dessa pessoa no cálculo.
- O volume de colaboradores distintos é o sinal principal; reputação, confirmações e divergências ajustam o resultado.
- A pontuação inicial de um grupo é `100 × relatos + 0,25 × reputação + 30 × confirmações ponderadas − 40 × divergências ponderadas`.
- Assim, vários usuários com o mesmo preço podem superar um relato isolado, mesmo quando esse autor tem reputação alta.
- O autor não pode confirmar o próprio relato. Uma pessoa que já participa do grupo de preço também não acrescenta um segundo peso como confirmação.
- O aplicativo consome o consenso calculado no PostgreSQL; clientes não recalculam ou acessam contribuições brutas de outros usuários.

## Presença e localização

- A localização é solicitada apenas após uma ação explícita do usuário.
- Check-in e confirmação só são aceitos a até 200 metros do posto.
- A coordenada exata não é armazenada no histórico de visitas; persistem somente posto, usuário, dia e distância aproximada.
- Cada usuário conta no máximo uma vez por posto por dia para métricas de visitação.
- Métricas públicas devem ser agregadas e nunca expor quais usuários visitaram o posto.
- Contagens públicas diárias só aparecem a partir de três visitas, reduzindo a possibilidade de identificar indivíduos em locais com pouco movimento.
- Localização em segundo plano é opcional e desligada até uma adesão clara do usuário.
- Uma geofence indica visita provável, não confirmação automática de combustível ou preço.
- Exija permanência mínima e precisão aceitável para evitar contar quem apenas passou pela via.
- O sinal de saída da geofence só gera visita e lembrete quando houver posição recente com precisão de até 100 metros e o PostGIS validar distância de até 200 metros.
- Ao tocar em um lembrete de visita, o aplicativo deve abrir o posto correspondente, nunca apenas a tela inicial genérica.
- Não mostrar formulários recorrentes. Sugestões de confirmação devem usar ações rápidas e limite de frequência.
- Não solicitar confirmação quando o preço já tiver consenso forte e recente; priorize preços antigos, divergentes ou com poucos relatos.

## Retenção e minimização

- Coordenadas precisas usadas na validação são transitórias; somente a distância aproximada pode permanecer.
- Visitas identificáveis são retidas por 90 dias e confirmações por 180 dias antes da consolidação anônima.
- Relatos de preço podem ser arquivados após 24 meses, mas o último preço conhecido de cada posto/combustível nunca é removido pela rotina de retenção.
- Conteúdo e autoria de correções resolvidas são anonimizados após 24 meses, preservando decisão e datas para auditoria.
- Estatísticas arquivadas sem identificador pessoal são mantidas por até 36 meses.
- A rotina efetiva exige relatório prévio, backup restaurável e validação em homologação; não executar limpeza automática sem esses controles.

## Linguagem

Prefira mensagens curtas e brasileiras, como “Preço enviado! Valeu pela ajuda.” Evite linguagem corporativa ou técnica nas telas.
