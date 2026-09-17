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
- [ ] Medir consultas com dados artificiais em escala.

## Critérios

- A busca continua disponível sem login.
- O aplicativo nunca mantém marcadores duplicados ao combinar regiões.
- O raio e os filtros continuam usando o catálogo dinâmico existente.
- Grupos devem se separar progressivamente conforme o usuário aproxima o mapa.
- Logotipos oficiais de bandeiras só serão adicionados com ativos adequados e validação de uso; a interface funciona sem depender deles.
