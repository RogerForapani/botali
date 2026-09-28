-- Remove exclusivamente a massa sintetica criada por homologation_10k_stations.sql.
-- Executar somente quando os testes terminarem.

begin;

delete from public.stations
where name like '[SYNTH HML]%';

delete from auth.users
where email in (
  'botali-hml-reporter-1@example.invalid',
  'botali-hml-reporter-2@example.invalid'
);

commit;

select jsonb_build_object(
  'remaining_stations', (
    select count(*) from public.stations where name like '[SYNTH HML]%'
  ),
  'remaining_reporters', (
    select count(*) from auth.users
    where email like 'botali-hml-reporter-%@example.invalid'
  )
) as verification;
