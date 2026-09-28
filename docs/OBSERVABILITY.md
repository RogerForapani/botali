# Observabilidade do botali

Esta etapa mede primeiro e aumenta capacidade depois. Ela cobre o caminho crítico de leitura do mapa, a saúde do Supabase e falhas técnicas do aplicativo sem criar rastreamento de localização.

## Sinais e metas iniciais

As metas abaixo são limites operacionais do botali para o alpha e beta, não garantias do Supabase. Devem ser revistas após quatro semanas de uso real.

| Sinal | Saudável | Atenção | Crítico |
| --- | ---: | ---: | ---: |
| Fluxo completo de busca do mapa (p95) | até 2,5 s | acima de 2,5 s | acima de 5 s |
| Falhas 5xx da API | abaixo de 1% | 1% a 2% | acima de 2% por 10 min |
| Sucesso das buscas no aparelho | 99% ou mais | 97% a 99% | abaixo de 97% |
| Conexões do banco | abaixo de 60% | 60% a 80% | acima de 80% |
| CPU ou memória do banco | abaixo de 70% | 70% a 85% | acima de 85% por 10 min |
| Banco/egress incluído no plano | abaixo de 70% | 70% a 85% | acima de 85% |
| Sessões bloqueadas | 0 | 1 transitória | recorrente ou com impacto |
| Transações acima de 30 s | 0 | 1 sob investigação | recorrente ou crescente |

Uma ocorrência isolada gera investigação, não upgrade automático. Escalar o plano exige tendência sustentada, impacto percebido e confirmação de que consulta, índice, cache ou retenção não resolvem o problema.

## Rotina operacional

### Antes do beta público

1. Repetir `npm run test:load:stations` em homologação com pelo menos 10 mil postos.
2. Salvar p50, p95, p99, taxa de erro, volume retornado e configuração de concorrência.
3. Executar `supabase/observability/health_snapshot.sql` antes e depois do ensaio.
4. Consultar o relatório de Database, API Gateway e Auth no Dashboard.
5. Revisar as consultas mais caras com `supabase/observability/slow_queries.sql`.

### Semanal durante o alpha

1. Revisar as últimas 24 horas nos Reports do Supabase: CPU, memória, conexões, latência, erros e transferência.
2. Executar o snapshot agregado e registrar somente os valores e o horário da observação.
3. Verificar pendências de moderação e volume de preços das últimas 24 horas.
4. Comparar com a semana anterior; não interpretar ausência de logs como prova de saúde sem conferir a janela de retenção.

### Ao investigar incidente

1. Registrar horário, versão do app, alcance e ação afetada.
2. Consultar erros 5xx com `supabase/observability/recent_api_errors.sql` numa janela curta.
3. Conferir bloqueios, transações longas, conexões e uso de recursos.
4. Reproduzir a busca com o teste de carga e guardar o resultado.
5. Se necessário, pedir ao usuário que compartilhe manualmente o diagnóstico técnico pelo Perfil.
6. Corrigir a causa, repetir as medições e documentar o resultado. Não cancelar consultas nem ampliar compute apenas pela idade de uma sessão.

## Diagnóstico do aplicativo

O aplicativo guarda localmente, no máximo, 20 falhas sanitizadas e 20 grupos de métricas. Para as buscas por raio e por área registra apenas:

- identificador fixo da operação;
- contagem e quantidade de falhas;
- duração média, p95, máxima e última duração;
- horário da última medição.

Não são registrados termos pesquisados, coordenadas, posto selecionado, e-mail ou token. Nada é enviado automaticamente: o usuário decide compartilhar pelo botão **Compartilhar diagnóstico técnico** no Perfil.

## Linha de base do projeto conectado — 28/09/2026

- Dashboard: CPU 2%, disco 13% e memória 54% no instante da observação.
- Snapshot SQL: banco com 20 MB, 18 de 60 conexões (30%), uma conexão ativa e nenhuma bloqueada.
- Busca por raio no `pg_stat_statements`: 54 chamadas, média de 121,56 ms e máximo de 400,84 ms.
- Busca pelos limites visíveis: 67 chamadas, média de 24,22 ms e máximo de 295,59 ms.
- Consenso de preços: 133 chamadas, média de 9,61 ms e máximo de 42,63 ms.

As estatísticas do PostgreSQL são acumuladas desde o último reset e medem somente o banco; não incluem rede, montagem da resposta nem renderização do aplicativo. A linha de base deve sempre ser comparada com snapshots equivalentes.

## Fontes de verdade

- Reports do Supabase para recursos, API, Auth e tendências operacionais.
- Logs Explorer para eventos com janela de tempo explícita.
- `pg_stat_statements` para custo acumulado das consultas.
- teste de carga do repositório para regressões do fluxo completo.
- diagnóstico local do aplicativo para diferenciar rede, backend e tempo percebido no dispositivo.
