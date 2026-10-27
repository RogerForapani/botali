-- Contribuicoes continuam no perfil depois da retencao dos registros operacionais.
-- Fonte e identificador sao guardados sem preco, endereco ou coordenadas.
begin;

create table private.community_contribution_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'price_report', 'validated_price_report', 'price_confirmation',
    'verified_station', 'approved_edit'
  )),
  source_id uuid not null,
  awarded_at timestamptz not null,
  primary key (user_id, event_type, source_id)
);

alter table private.community_contribution_events enable row level security;
revoke all on private.community_contribution_events from public, anon, authenticated;

-- Backfill antes de instalar os gatilhos. Nenhum ponto e inventado.
insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
select user_id, 'price_report', id, created_at from public.price_submissions
on conflict do nothing;

insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
select user_id, 'price_confirmation', submission_id, created_at from public.price_confirmations
on conflict do nothing;

insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
select ps.user_id, 'validated_price_report', ps.id, min(pc.created_at)
from public.price_submissions ps
join public.price_confirmations pc on pc.submission_id = ps.id
  and pc.user_id <> ps.user_id and pc.agrees
group by ps.user_id, ps.id
on conflict do nothing;

insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
select created_by, 'verified_station', id, created_at
from public.stations where status = 'verified' and created_by is not null
on conflict do nothing;

insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
select user_id, 'approved_edit', id, coalesce(resolved_at, created_at)
from public.station_edit_requests where status = 'approved' and user_id is not null
on conflict do nothing;

create function private.record_community_contribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_author uuid;
begin
  if tg_table_name = 'price_submissions' then
    insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
    values (new.user_id, 'price_report', new.id, new.created_at)
    on conflict do nothing;
  elsif tg_table_name = 'price_confirmations' then
    insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
    values (new.user_id, 'price_confirmation', new.submission_id, new.created_at)
    on conflict do nothing;

    if new.agrees then
      select ps.user_id into report_author
      from public.price_submissions ps where ps.id = new.submission_id;
      if report_author is not null and report_author <> new.user_id then
        insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
        values (report_author, 'validated_price_report', new.submission_id, new.created_at)
        on conflict do nothing;
      end if;
    end if;
  elsif tg_table_name = 'stations' then
    if new.status = 'verified' and new.created_by is not null then
      insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
      values (new.created_by, 'verified_station', new.id, new.created_at)
      on conflict do nothing;
    end if;
  elsif tg_table_name = 'station_edit_requests' then
    if new.status = 'approved' and new.user_id is not null then
      insert into private.community_contribution_events (user_id, event_type, source_id, awarded_at)
      values (new.user_id, 'approved_edit', new.id, coalesce(new.resolved_at, new.created_at))
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger community_record_price_report after insert on public.price_submissions
for each row execute function private.record_community_contribution();
create trigger community_record_price_confirmation after insert or update of agrees on public.price_confirmations
for each row execute function private.record_community_contribution();
create trigger community_record_station_insert after insert on public.stations
for each row execute function private.record_community_contribution();
create trigger community_record_station_approval after update of status on public.stations
for each row execute function private.record_community_contribution();
create trigger community_record_edit_insert after insert on public.station_edit_requests
for each row execute function private.record_community_contribution();
create trigger community_record_edit_approval after update of status on public.station_edit_requests
for each row execute function private.record_community_contribution();

revoke execute on function private.record_community_contribution() from public, anon, authenticated;

create or replace function public.my_community_profile()
returns table (
  display_name text,
  avatar_url text,
  profile_is_public boolean,
  trust_score integer,
  price_reports bigint,
  validated_price_reports bigint,
  price_confirmations bigint,
  verified_stations bigint,
  approved_edits bigint,
  contribution_points bigint,
  level_number integer,
  level_title text,
  level_min_points bigint,
  next_level_points bigint,
  level_progress_percent integer,
  badges jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with profile_summary as (
    select
      p.id,
      p.display_name,
      p.avatar_url,
      p.profile_is_public,
      p.trust_score,
      (select count(*) from private.community_contribution_events e where e.user_id = p.id and e.event_type = 'price_report') as price_reports,
      (select count(*) from private.community_contribution_events e where e.user_id = p.id and e.event_type = 'validated_price_report') as validated_price_reports,
      (select count(*) from private.community_contribution_events e where e.user_id = p.id and e.event_type = 'price_confirmation') as price_confirmations,
      (select count(*) from private.community_contribution_events e where e.user_id = p.id and e.event_type = 'verified_station') as verified_stations,
      (select count(*) from private.community_contribution_events e where e.user_id = p.id and e.event_type = 'approved_edit') as approved_edits
    from public.profiles p
    where p.id = (select auth.uid())
  ), scored as (
    select summary.*,
      summary.validated_price_reports * 5
      + least(summary.price_confirmations, 50::bigint)
      + summary.verified_stations * 12
      + summary.approved_edits * 8 as contribution_points
    from profile_summary summary
  ), leveled as (
    select scored.*,
      case
        when contribution_points >= 400 then 5
        when contribution_points >= 180 then 4
        when contribution_points >= 75 then 3
        when contribution_points >= 25 then 2
        else 1
      end as level_number,
      case
        when contribution_points >= 400 then 'Guardião Botali'
        when contribution_points >= 180 then 'Referência Local'
        when contribution_points >= 75 then 'Parceiro da Estrada'
        when contribution_points >= 25 then 'Colaborador'
        else 'Explorador'
      end as level_title,
      case
        when contribution_points >= 400 then 400
        when contribution_points >= 180 then 180
        when contribution_points >= 75 then 75
        when contribution_points >= 25 then 25
        else 0
      end::bigint as level_min_points,
      case
        when contribution_points >= 400 then 400
        when contribution_points >= 180 then 400
        when contribution_points >= 75 then 180
        when contribution_points >= 25 then 75
        else 25
      end::bigint as next_level_points
    from scored
  )
  select
    level.display_name,
    level.avatar_url,
    level.profile_is_public,
    level.trust_score,
    level.price_reports,
    level.validated_price_reports,
    level.price_confirmations,
    level.verified_stations,
    level.approved_edits,
    level.contribution_points,
    level.level_number,
    level.level_title,
    level.level_min_points,
    level.next_level_points,
    case
      when level.level_number = 5 then 100
      else least(100, greatest(0, round(
        (level.contribution_points - level.level_min_points)::numeric * 100
        / nullif(level.next_level_points - level.level_min_points, 0)
      )::integer))
    end as level_progress_percent,
    (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', earned.id,
          'title', earned.title,
          'description', earned.description,
          'iconName', earned.icon_name,
          'accentColor', earned.accent_color,
          'awardedAt', earned.awarded_at
        ) order by earned.sort_order, earned.title
      ), '[]'::jsonb)
      from (
        select badge.*, null::timestamptz as awarded_at
        from public.community_badges badge
        where (badge.id = 'first-validated-price' and level.validated_price_reports >= 3)
           or (badge.id = 'community-checker' and level.price_confirmations >= 20)
           or (badge.id = 'station-scout' and level.verified_stations >= 2)
           or (badge.id = 'trusted-editor' and level.approved_edits >= 3)
        union all
        select badge.*, award.awarded_at
        from public.user_community_badges award
        join public.community_badges badge on badge.id = award.badge_id
        where award.user_id = level.id
      ) earned
    ) as badges
  from leveled level;
$$;


revoke execute on function public.my_community_profile() from public, anon;
grant execute on function public.my_community_profile() to authenticated;
comment on function public.my_community_profile() is
  'Retorna progresso preservado em eventos privados, mesmo apos retencao dos registros operacionais.';


commit;
