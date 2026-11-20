-- Official ANP imports have no community author. Keep provenance separate from
-- community moderation, and never award contributor points for source imports.
begin;

alter table public.stations add column source_kind text not null default 'community';
alter table public.stations alter column created_by drop not null;
alter table public.stations add constraint stations_source_kind_check
  check (source_kind in ('community', 'anp'));
alter table public.stations add constraint stations_source_author_check
  check ((source_kind = 'community' and created_by is not null)
      or (source_kind = 'anp' and created_by is null));

create table public.station_import_sources (
  station_id uuid primary key references public.stations(id) on delete cascade,
  provider text not null check (provider = 'ANP'),
  external_id text not null,
  cnpj text not null check (cnpj ~ '^[0-9]{14}$'),
  anp_authorization text,
  source_url text not null,
  coordinate_accuracy_m numeric(8,2),
  coordinate_obtained_on date,
  coordinate_reviewed boolean not null default false,
  imported_at timestamptz not null default now(),
  unique (provider, external_id),
  unique (provider, cnpj)
);
create index station_import_sources_provider_idx
  on public.station_import_sources (provider, imported_at desc);

alter table public.station_import_sources enable row level security;
revoke all on public.station_import_sources from public, anon, authenticated;
grant select on public.station_import_sources to anon, authenticated;
create policy station_import_sources_public_read
  on public.station_import_sources for select to anon, authenticated
  using (exists (
    select 1 from public.stations s
    where s.id = station_id and s.status = 'verified'
  ));

commit;
