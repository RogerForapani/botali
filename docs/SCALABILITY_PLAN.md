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
- [ ] Repetir o teste com pelo menos 10 mil postos e volume proporcional de preços antes do beta público.

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

## Critérios

- A busca continua disponível sem login.
- Uma nova busca por área substitui os marcadores anteriores; somente páginas da mesma área são combinadas, sem duplicidade.
- O raio e os filtros continuam usando o catálogo dinâmico existente.
- Grupos devem se separar progressivamente conforme o usuário aproxima o mapa.
- Logotipos oficiais de bandeiras só serão adicionados com ativos adequados e validação de uso; a interface funciona sem depender deles.
