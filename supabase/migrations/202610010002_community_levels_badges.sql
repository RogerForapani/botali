-- Niveis comunitarios e badges. O progresso usa somente contribuicoes com
-- algum sinal de qualidade; nunca altera o peso do usuario no consenso.

create table if not exists public.community_badges (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  title text not null check (char_length(title) between 2 and 40),
  description text not null check (char_length(description) between 2 and 180),
  icon_name text not null check (char_length(icon_name) between 2 and 40),
  accent_color text not null check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.community_programs (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  badge_id text not null references public.community_badges(id),
  enrollment_open boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.user_community_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.community_badges(id),
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles(id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 240),
  primary key (user_id, badge_id)
);

alter table public.community_badges enable row level security;
alter table public.community_programs enable row level security;
alter table public.user_community_badges enable row level security;

revoke all on public.community_badges from anon, authenticated;
revoke all on public.community_programs from anon, authenticated;
revoke all on public.user_community_badges from anon, authenticated;

insert into public.community_badges (id, title, description, icon_name, accent_color, sort_order)
values
  ('first-validated-price', 'Preço confirmado', 'Teve o primeiro preço confirmado por outra pessoa.', 'check-decagram', '#22C55E', 10),
  ('community-checker', 'Olhar da comunidade', 'Realizou pelo menos 10 confirmações de preço.', 'account-check', '#3B82F6', 20),
  ('station-scout', 'Explorador de postos', 'Cadastrou um posto aprovado pela moderação.', 'map-marker-plus', '#FBBF24', 30),
  ('trusted-editor', 'Mapa mais preciso', 'Teve uma correção de posto aprovada.', 'map-check', '#A855F7', 40),
  ('beta-pioneer', 'Pioneiro do Beta', 'Participou do período beta do Botali.', 'rocket-launch', '#22C55E', 5)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    icon_name = excluded.icon_name,
    accent_color = excluded.accent_color,
    sort_order = excluded.sort_order;

insert into public.community_programs (id, badge_id, enrollment_open, starts_at)
values ('botali-beta', 'beta-pioneer', true, now())
on conflict (id) do nothing;

create or replace function private.award_open_program_badges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_community_badges (user_id, badge_id, reason)
  select new.id, program.badge_id, 'Entrada durante programa comunitario ativo'
  from public.community_programs program
  where program.enrollment_open
    and program.starts_at <= now()
    and (program.ends_at is null or program.ends_at > now())
  on conflict (user_id, badge_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_award_open_program_badges on public.profiles;
create trigger profiles_award_open_program_badges
after insert on public.profiles
for each row execute function private.award_open_program_badges();

revoke execute on function private.award_open_program_badges() from public, anon, authenticated;

-- Contas criadas antes desta migracao participaram do periodo de testes.
insert into public.user_community_badges (user_id, badge_id, reason)
select profile.id, program.badge_id, 'Conta ativa no inicio do programa beta'
from public.profiles profile
join public.community_programs program on program.id = 'botali-beta'
where program.enrollment_open
on conflict (user_id, badge_id) do nothing;

drop function if exists public.my_community_profile();
create function public.my_community_profile()
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
      (select count(*) from public.price_submissions ps where ps.user_id = p.id) as price_reports,
      (
        select count(*)
        from public.price_submissions ps
        where ps.user_id = p.id
          and exists (
            select 1
            from public.price_confirmations pc
            where pc.submission_id = ps.id
              and pc.user_id <> p.id
              and pc.agrees
          )
      ) as validated_price_reports,
      (select count(*) from public.price_confirmations pc where pc.user_id = p.id) as price_confirmations,
      (select count(*) from public.stations s where s.created_by = p.id and s.status = 'verified') as verified_stations,
      (select count(*) from public.station_edit_requests ser where ser.user_id = p.id and ser.status = 'approved') as approved_edits
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
        where (badge.id = 'first-validated-price' and level.validated_price_reports >= 1)
           or (badge.id = 'community-checker' and level.price_confirmations >= 10)
           or (badge.id = 'station-scout' and level.verified_stations >= 1)
           or (badge.id = 'trusted-editor' and level.approved_edits >= 1)
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
  'Retorna perfil proprio, progresso de nivel e badges sem alterar o consenso de precos.';
comment on table public.user_community_badges is
  'Trilha permanente de badges concedidos pelo servidor, com data, origem e motivo.';
