-- Perfil comunitario: dados editaveis, privacidade e resumo agregado do proprio usuario.
-- Niveis e badges serao adicionados em uma migracao posterior, sem alterar o
-- peso das contribuicoes no consenso de precos.

alter table public.profiles
  add column if not exists profile_is_public boolean not null default false;

revoke update (display_name, avatar_url) on public.profiles from authenticated;

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
  approved_edits bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.display_name,
    p.avatar_url,
    p.profile_is_public,
    p.trust_score,
    (select count(*) from public.price_submissions ps where ps.user_id = p.id),
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
    ),
    (select count(*) from public.price_confirmations pc where pc.user_id = p.id),
    (select count(*) from public.stations s where s.created_by = p.id and s.status = 'verified'),
    (select count(*) from public.station_edit_requests ser where ser.user_id = p.id and ser.status = 'approved')
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.update_my_community_profile(
  p_display_name text,
  p_avatar_url text,
  p_profile_is_public boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := nullif(btrim(p_display_name), '');
  clean_avatar text := nullif(btrim(p_avatar_url), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 40 then
    raise exception 'Display name must have between 2 and 40 characters';
  end if;

  if clean_avatar is not null and (char_length(clean_avatar) > 500 or clean_avatar !~ '^https://') then
    raise exception 'Avatar URL must use HTTPS and have at most 500 characters';
  end if;

  update public.profiles
  set display_name = clean_name,
      avatar_url = clean_avatar,
      profile_is_public = coalesce(p_profile_is_public, false)
  where id = (select auth.uid());

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke execute on function public.my_community_profile() from public, anon;
revoke execute on function public.update_my_community_profile(text, text, boolean) from public, anon;
grant execute on function public.my_community_profile() to authenticated;
grant execute on function public.update_my_community_profile(text, text, boolean) to authenticated;

comment on column public.profiles.profile_is_public is
  'Opt-in para futura exibicao do perfil comunitario. Privado por padrao.';
comment on function public.my_community_profile() is
  'Retorna somente o perfil e contagens agregadas do usuario autenticado.';
