-- Execute no SQL Editor com a fonte "Database".
-- O Supabase normalmente mantém pg_stat_statements habilitado. A primeira consulta confirma isso.

select
  extname,
  extversion
from pg_extension
where extname = 'pg_stat_statements';

-- Execute somente se a consulta anterior retornar uma linha.
-- Os valores literais são normalizados pelo pg_stat_statements, mas este relatório continua restrito aos operadores.
select
  calls,
  round(total_exec_time::numeric, 2) as total_exec_time_ms,
  round(mean_exec_time::numeric, 2) as mean_exec_time_ms,
  round(max_exec_time::numeric, 2) as max_exec_time_ms,
  rows,
  left(query, 240) as normalized_query
from extensions.pg_stat_statements
where dbid = (select oid from pg_database where datname = current_database())
order by total_exec_time desc
limit 20;
