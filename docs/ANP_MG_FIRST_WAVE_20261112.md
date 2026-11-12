# Primeira leva de postos ANP em Minas Gerais

Executada somente na homologação `phsvoeljsaksglqrpstm` em 12/11/2026.
A lista integral de 5.048 registros da ANP continua como arquivo de revisão,
sem importação em massa.

## Cruzamento com a comunidade

- Antes da revisão havia quatro postos comunitários. O autor confirmou que
  `Independente` e `Rede Graal`, ambos em Rua Icobe, 74, Contagem, eram testes.
  Após inventário e backup criptografado recuperado do B2
  (`20261111-234841-homologacao-gqTG7d.gpg`), os dois foram removidos junto
  de quatro relatos, confirmações, visitas, moderação e pontos vinculados.
- Restaram `Raízen` na Avenida Raja Gabáglia, 20, BH, e `Petrobras` na Rua
  Cardeal Arco Verde, 892, Contagem. O segundo fica a cerca de 18 m de um
  registro ANP na mesma rua, número 909 (`SIMP 1017157`, distribuidora VIBRA):
  **possível correspondência, ainda não vinculada** por divergência no número.
- O primeiro fica a cerca de 39 m de um cadastro ANP de outra distribuidora e
  com endereço diferente; não houve correspondência segura. Os dois IDs e
  respectivos relatos foram preservados.

## Seleção e publicação

- `scripts/prepare_anp_first_wave.py` seleciona 20 registros do snapshot ANP,
  dois por cidade em BH, Contagem, Betim, Nova Lima, Ribeirão das Neves,
  Santa Luzia, Sabará, Ibirité, Vespasiano e Lagoa Santa.
- Critérios: posição presente e sem duplicata exata na fonte; estimativa de
  precisão de até 10 m; obtenção da posição desde 2022; ao menos 150 m dos
  postos preservados e dos demais selecionados; CNPJ, SIMP, endereço e produto
  automotivo presentes. A seleção resultou em 20 postos com precisão estimada
  entre 3 e 5 m; 15 posições obtidas em 2026, três em 2025, duas em 2023.
- A ANP ainda marca essas posições como **não validadas**. A estimativa não é
  confirmação independente. O app passa a sinalizar “Cadastro da ANP · ponto
  no mapa a conferir” nos detalhes.
- A migração `202611120001_anp_station_origin.sql` registra a origem ANP com
  CNPJ, SIMP, autorização, data e estimativa de precisão, sem autor comunitário.
  Importações oficiais não criam pontos de contribuição para usuários.
- O SQL versionado `supabase/imports/anp_mg_first_wave_20_20261112.sql` aplica
  a seleção com guardas de identidade e distância. A versão em CSV para
  conferência está em
  `C:\Users\roger\Downloads\Botali-beta\ANP-MG-2026-11-11\anp-mg-first-wave-20.csv`.
- Verificação após a transação: 22 postos no total, dos quais 20 ANP e dois
  comunitários; 20 registros de origem; dois postos ANP por cidade; nenhum
  preço fabricado, nenhum ponto de contribuição oficial e nenhum par ANP a
  menos de 150 m. A leitura como visitante vê os 20 postos e a origem.
- Combustíveis foram associados a partir dos produtos cadastrados na ANP;
  essa lista não garante disponibilidade momentânea. Preços continuam vazios
  até contribuições da comunidade. Serviços e recarga elétrica não foram
  presumidos.
- O backup do estado **após a importação**,
  `20261112-105120-homologacao-eva5AF.gpg`, também terminou com sucesso e foi
  recuperado do B2 para conferir o hash.

## Próximas verificações

- Testar a visualização em aparelho e revisar no mapa os 20 pontos e nomes.
- Verificar especificamente a divergência de número do posto em Contagem;
  se o cadastro ANP e o posto comunitário forem o mesmo estabelecimento,
  vincular a identidade ANP ao ID existente sem descartar preços.
- Só ampliar para outros municípios após revisar os 20 pontos e a indicação
  de origem. Os 405 registros sem coordenadas exigem outro fluxo de localização.
