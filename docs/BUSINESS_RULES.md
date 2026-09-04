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
- Se faltar um dos preços, não mostre a comparação.
- No mapa, o preço escolhido continua sendo a informação principal; a relação flex aparece como informação secundária compacta.

## Recarga elétrica

- O modo de recarga do mapa mostra apenas postos que tenham esse serviço confirmado.
- Recarga elétrica é um serviço do posto e não deve ser tratada como tipo de combustível líquido.

## Postos

- Novos cadastros entram como `pending`.
- Cadastro deve usar localização válida.
- Postos dentro do limite geográfico de duplicidade devem ser bloqueados ou encaminhados para correção; o MVP usa 100 metros.

## Confiança e reputação

- Confirmações recentes e contribuições consistentes aumentam confiança.
- Divergências, dados antigos e correções reduzem confiança.
- Evoluções do algoritmo devem ser documentadas e auditáveis antes de alterar os limites oficiais.

## Linguagem

Prefira mensagens curtas e brasileiras, como “Preço enviado! Valeu pela ajuda.” Evite linguagem corporativa ou técnica nas telas.
