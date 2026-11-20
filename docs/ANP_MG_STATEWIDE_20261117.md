# Cadastro estadual ANP em homologação

Em 17/11/2026, o Botali importou a amostra oficial da ANP extraída em
11/11/2026 (`GET /v1/combustivel?uf=MG&numeropagina=N`) para a homologação
`phsvoeljsaksglqrpstm`. A atualização do cadastro deve ser repetida antes do
beta público, pois o estado operacional dos postos pode mudar.

## Resultado

- 5.048 registros oficiais de MG em `anp_station_catalog`, com CNPJ/SIMP e
  documento de origem; a tabela não é legível pelo aplicativo.
- 4.625 postos ANP consultáveis no mapa (4.605 novos e 20 da primeira leva),
  em 799 municípios. Os dois postos comunitários permaneceram intactos.
- 423 registros aguardam revisão: 405 sem coordenadas, 16 sem combustível
  rodoviário e dois próximos de postos comunitários possivelmente equivalentes.
- Nenhum preço, serviço ou ponto de contribuição foi criado pela importação.
  As coordenadas da ANP continuam sinalizadas como não validadas no aplicativo.
- Os postos da ANP continuam identificados no aplicativo pela bandeira; o nome
  legal original permanece no banco e nos detalhes do posto.

## Verificações

- Backup anterior recuperado do B2 com SHA-256 correspondente:
  `20261117-224259-homologacao-rHaxUL.gpg`.
- A transação completa foi executada primeiro com `ROLLBACK`, com 4.605
  elegíveis, 20 já importados, 4.627 postos e 20.042 vínculos novos de
  combustíveis no resultado ensaiado.
- Após `COMMIT`: 4.625 cadastros ANP, 4.625 registros de origem, zero postos
  ANP sem origem, zero postos ANP sem combustível, zero preços ANP. A função de
  busca por raio devolveu 200 postos em BH como visitante. A tabela de catálogo
  não concede leitura anônima.
- Backup posterior recuperado do B2 com SHA-256 correspondente:
  `20261117-225215-homologacao-KmeaPE.gpg`.

## Arquivos e repetição

- `scripts/prepare_anp_mg_full_import.py` prepara o SQL transacional;
  `scripts/prepare_anp_mg_catalog.py` prepara o catálogo integral.
- `supabase/migrations/202611170001_anp_distinct_stations.sql` permite
  identidades oficiais distintas próximas entre si, preservando a checagem
  comunitária. `202611170002_anp_station_catalog.sql` cria o catálogo restrito.
- SQL gerado e amostra CSV ficam em
  `C:\Users\roger\Downloads\Botali-beta\ANP-MG-2026-11-11`.
- `supabase/imports/verify_anp_mg_full_20261117.sql` e
  `verify_anp_mg_catalog_20261117.sql` conferem os totais e a leitura pública.

Os 405 registros sem coordenadas não aparecem no mapa até uma posição ser
conferida. Os dois possíveis duplicados comunitários exigem comparação de
identidade para manter preços e contribuições existentes.
