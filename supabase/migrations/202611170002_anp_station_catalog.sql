-- Preserve every ANP MG source record, including those without a map point.
create table if not exists public.anp_station_catalog (
  cnpj text primary key check (cnpj ~ '^[0-9]{14}$'),
  simp text not null,
  source_record jsonb not null,
  station_id uuid references public.stations(id) on delete set null,
  review_reason text,
  retrieved_at_utc timestamptz not null,
  cataloged_at timestamptz not null default now()
);
create index if not exists anp_station_catalog_station_idx on public.anp_station_catalog(station_id);
alter table public.anp_station_catalog enable row level security;
revoke all on public.anp_station_catalog from public, anon, authenticated;
