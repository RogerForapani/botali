-- Execute no Logs Explorer com a fonte "Logs" e uma janela explícita de até 24 horas.
-- Esta sintaxe é ClickHouse SQL, não PostgreSQL.

select
  timestamp,
  id,
  toInt32OrZero(log_attributes['response.status_code']) as status,
  log_attributes['request.path'] as path
from logs
where source = 'edge_logs'
  and toInt32OrZero(log_attributes['response.status_code']) between 500 and 599
order by timestamp desc
limit 100;
