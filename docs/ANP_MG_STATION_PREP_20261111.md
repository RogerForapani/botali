# Substituição dos postos de teste por candidatos da ANP em Minas Gerais

Levantamento e limpeza executados em 11/11/2026 **somente na homologação**
`phsvoeljsaksglqrpstm`. Nenhum candidato da ANP foi importado ao banco nesta etapa.

## Salvaguarda e exclusão

- Antes da exclusão, o backup criptografado
  `20261111-232508-homologacao-uM3KpZ.gpg` foi concluído e recuperado do B2
  com hash correspondente; a cópia local no WSL também confere.
- Inventário antes da operação: 10.000 `[SYNTH HML]`, zero `[DEMO RMBH]` e
  dois postos individuais de teste (`[TESTE HML]` e `[TESTE HTML]`). As chaves
  estrangeiras de posto tinham `ON DELETE CASCADE`.
- A transação removeu 10.002 postos, 80.004 relatos de preço, 40.000 vínculos
  de combustível, 15.334 serviços, dois eventos de alerta, três solicitações de
  edição e os eventos de pontuação vinculados às fontes removidas. Três contas
  técnicas sintéticas foram eliminadas. Dois relatos pertenciam a contas reais
  de teste, e sua pontuação vinculada a esses relatos foi removida.
- Verificação posterior: zero postos com os prefixos acima, zero contas técnicas;
  quatro postos comunitários e dez relatos de preço permaneceram no banco.
- Uma nova cópia **após** a limpeza, `20261111-233321-homologacao-XrFE4T.gpg`,
  também foi concluída, recuperada do B2 para comparação de hash e conferida
  na cópia local do WSL.
- Scripts executados: `supabase/test-data/inventory_demo_cleanup.sql` e
  `supabase/test-data/remove_all_homologation_test_stations_20261111.sql`.

## Fonte real preparada

- Fonte: API oficial da ANP `GET /v1/combustivel?uf=MG&numeropagina=N`.
  A ANP publica o cadastro de revendedores em operação; a API fornece endereço,
  bandeira, CNPJ, produtos e, quando disponíveis, coordenadas e metadados de
  qualidade da posição.
- Exportação reproduzível: `scripts/prepare_anp_mg_stations.py`. Os arquivos
  locais estão em `C:\Users\roger\Downloads\Botali-beta\ANP-MG-2026-11-11`:
  `anp-mg-candidates.csv` (todas as 5.048 linhas),
  `anp-mg-review-sample.csv` (60 linhas) e `anp-mg-report.json` (hashes e totais).
- 5.048 postos de 846 municípios; 4.643 com coordenadas e 405 sem coordenadas.
  Nas dez cidades piloto da RMBH há 598 registros, 595 com coordenadas.
- Nenhum endereço ou produto está vazio na resposta. Há 21 pares adicionais
  de coordenadas exatamente iguais; precisam de revisão antes de deduplicar.
- As 4.643 posições com coordenadas são marcadas pela própria ANP como
  **“Posição Geográfica não validada”**. Não tratá-las como ponto confirmado.
- A exportação não contém preços. Produtos cadastrados na ANP não provam preço
  atual, estoque ou presença de recarga elétrica.

## Próxima etapa de importação

1. Criar identidade de origem ANP por CNPJ/SIMP/autorização e registrar data da
   última sincronização, sem usar nome ou distância como chave única.
2. Cruzar os candidatos com os quatro postos comunitários já existentes;
   preservar os respectivos IDs e contribuições quando houver correspondência.
3. Revisar coordenadas duvidosas, especialmente 21 coincidências exatas;
   definir política para 405 postos sem ponto.
4. Importar primeiro uma amostra revisada em homologação, sem preços, com
   distinção visível entre cadastro da ANP e validação comunitária. Validar
   mapa, busca e moderação, então ampliar para MG.

A limpeza não deve ser reexecutada sem novo inventário: a transação exige
contagens exatas e abortará se o banco mudar.
