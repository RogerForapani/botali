# Plano de escalabilidade

O crescimento do botali será tratado de forma incremental, medindo o uso real antes de adicionar complexidade operacional.

## Sequência acordada

1. **Busca geográfica paginada** — limitar cada consulta a 200 postos, carregar novas áreas conforme o mapa se move e agrupar marcadores próximos visualmente.
2. **Índices adicionais** — revisar filas de moderação, histórico por usuário, status de postos e consultas de preços recentes com `EXPLAIN ANALYZE` e o Index Advisor.
3. **Teste de carga** — validar consultas com volumes artificiais de postos, usuários e relatos antes do lançamento público.
4. **Observabilidade** — acompanhar CPU, memória, tamanho do banco, conexões, latência, erros e transferência de dados no Supabase.
5. **Retenção de histórico** — definir quando arquivar contribuições antigas sem perder auditoria ou estatísticas úteis.
6. **Consenso pré-calculado** — materializar o preço comunitário atual quando o cálculo sob demanda deixar de atender às metas de latência.
7. **Capacidade contratada** — migrar do plano gratuito e ampliar compute, disco ou réplicas conforme métricas e alertas, não apenas pelo número de cadastros.

## Sprint atual

- [x] Limite máximo de 200 postos por consulta no PostgreSQL/PostGIS.
- [x] Paginação adicional dentro da mesma área.
- [x] Carregamento incremental ao buscar uma nova região do mapa.
- [x] Agrupamento visual de marcadores próximos.
- [x] Identificação textual compacta da bandeira no mapa e reforçada nos detalhes.
- [x] Criar teste de carga reproduzível para busca geográfica e carregamento dos dados complementares do mapa.
- [x] Repetir o teste de planos com 10 mil postos e 80 mil relatos em tabelas temporárias isoladas.
- [ ] Repetir o teste ponta a ponta em um projeto de homologação antes do beta público.

## Teste de carga do mapa

O comando abaixo simula o fluxo de leitura do aplicativo: consulta geográfica, consenso de preços, serviços e combustíveis. Ele alterna buscas pelo retângulo visível e por raios de 10, 25 e 100 km, sem criar ou alterar dados.

```powershell
npm run test:load:stations
```

Por padrão são 60 leituras com concorrência 5 e meta de p95 total de até 2,5 segundos. Para ajustar o ensaio:

```powershell
npm run test:load:stations -- --requests=120 --concurrency=10 --target-p95-ms=2500
```

O teste atual com 300 postos demonstrativos serve como linha de base funcional. Ele não substitui o ensaio pré-beta com pelo menos 10 mil postos, porque índices e planos de execução podem se comportar de forma diferente quando as tabelas crescerem.

### Linha de base — 28/09/2026

- 60 fluxos completos com concorrência 5.
- Nenhum erro ou resposta inválida.
- p95 geral de 591 ms.
- Maior p95 entre os cenários: 667 ms na busca de raio de 10 km.
- As buscas que atingiram o limite retornaram 200 postos e permaneceram abaixo da meta de 2,5 segundos.

Esses números refletem o projeto gratuito e a massa atual de aproximadamente 300 postos demonstrativos. O próximo teste de volume deve ocorrer em um ambiente separado, evitando inserir milhares de registros no banco usado pelos testes funcionais do aplicativo.

O ensaio SQL isolado está em `supabase/test-data/performance_10k_explain.sql`. Ele cria tabelas temporárias com 10 mil postos e 80 mil relatos, mede os planos da busca por raio, limites visíveis e consenso de 200 postos e não escreve nas tabelas públicas do aplicativo.

### Planos com 10 mil postos — 28/09/2026

| Consulta | Execução | Índice utilizado |
| --- | ---: | :---: |
| Busca por raio de 25 km | 94,085 ms | Sim |
| Consenso de 200 postos | 7,663 ms | Sim |
| Limites visíveis antes da otimização | 6,196 ms | Não |
| Limites visíveis usando `geography` | 3,780 ms | Sim |

A medição motivou a migração `202609280001_optimize_visible_bounds_geography.sql`, que preserva a busca retangular e passa a aproveitar o índice GiST já existente. Os tempos são do PostgreSQL, sem rede ou renderização do aplicativo.

Após aplicar a migração no projeto conectado, o teste ponta a ponta atual de 60 leituras terminou sem erros e com p95 geral de 529 ms. Essa segunda execução é uma verificação funcional da otimização, não uma comparação estatística definitiva com a linha de base anterior.

## Critérios

- A busca continua disponível sem login.
- Uma nova busca por área substitui os marcadores anteriores; somente páginas da mesma área são combinadas, sem duplicidade.
- O raio e os filtros continuam usando o catálogo dinâmico existente.
- Grupos devem se separar progressivamente conforme o usuário aproxima o mapa.
- Logotipos oficiais de bandeiras só serão adicionados com ativos adequados e validação de uso; a interface funciona sem depender deles.
