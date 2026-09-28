-- Execute no SQL Editor com a fonte "Database".
-- Retorna somente métricas agregadas; não lê e-mail, coordenadas ou conteúdo individual.

with database_activity as (
  select
    count(*) filter (where datname = current_database())::integer as connections,
    count(*) filter (where datname = current_database() and state = 'active')::integer as active_connections,
    count(*) filter (
      where datname = current_database()
        and cardinality(pg_blocking_pids(pid)) > 0
    )::integer as blocked_connections,
    count(*) filter (
      where datname = current_database()
        and xact_start is not null
        and now() - xact_start > interval '30 seconds'
    )::integer as transactions_over_30s
  from pg_stat_activity
), database_io as (
  select
    blks_hit,
    blks_read,
    temp_bytes,
    deadlocks
  from pg_stat_database
  where datname = current_database()
), table_health as (
  select
    coalesce(sum(n_live_tup), 0)::bigint as estimated_live_rows,
    coalesce(sum(n_dead_tup), 0)::bigint as estimated_dead_rows
  from pg_stat_user_tables
), product_counts as (
  select
    (select count(*) from public.stations where status = 'verified')::bigint as verified_stations,
    (select count(*) from public.stations where status = 'pending')::bigint as pending_stations,
    (select count(*) from public.station_edit_requests where status = 'pending')::bigint as pending_station_edits,
    (select count(*) from public.price_submissions where created_at >= now() - interval '24 hours')::bigint as price_submissions_24h
)
select
  now() as observed_at,
  pg_database_size(current_database()) as database_bytes,
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  current_setting('max_connections')::integer as max_connections,
  a.connections,
  a.active_connections,
  round(100.0 * a.connections / nullif(current_setting('max_connections')::numeric, 0), 1) as connection_use_pct,
  a.blocked_connections,
  a.transactions_over_30s,
  round(100.0 * io.blks_hit / nullif(io.blks_hit + io.blks_read, 0), 2) as cache_hit_pct,
  io.temp_bytes,
  io.deadlocks,
  t.estimated_live_rows,
  t.estimated_dead_rows,
  p.verified_stations,
  p.pending_stations,
  p.pending_station_edits,
  p.price_submissions_24h
from database_activity a
cross join database_io io
cross join table_health t
cross join product_counts p;
