-- Sprint 6: exclusao de conta iniciada pelo proprio usuario.

alter table public.stations alter column created_by drop not null;
alter table public.stations drop constraint if exists stations_created_by_fkey;
alter table public.stations add constraint stations_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.station_services alter column created_by drop not null;
alter table public.station_services drop constraint if exists station_services_created_by_fkey;
alter table public.station_services add constraint station_services_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.price_submissions drop constraint if exists price_submissions_user_id_fkey;
alter table public.price_submissions add constraint price_submissions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.station_edit_requests drop constraint if exists station_edit_requests_user_id_fkey;
alter table public.station_edit_requests add constraint station_edit_requests_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.station_moderation_actions alter column moderator_id drop not null;
alter table public.station_moderation_actions drop constraint if exists station_moderation_actions_moderator_id_fkey;
alter table public.station_moderation_actions add constraint station_moderation_actions_moderator_id_fkey foreign key (moderator_id) references public.profiles(id) on delete set null;

alter table public.station_edit_moderation_actions alter column moderator_id drop not null;
alter table public.station_edit_moderation_actions drop constraint if exists station_edit_moderation_actions_moderator_id_fkey;
alter table public.station_edit_moderation_actions add constraint station_edit_moderation_actions_moderator_id_fkey foreign key (moderator_id) references public.profiles(id) on delete set null;

create or replace function public.delete_my_account(confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  if upper(trim(confirmation)) <> 'EXCLUIR' then raise exception 'Confirmação inválida'; end if;
  delete from auth.users where id = account_id;
  if not found then raise exception 'Conta não encontrada'; end if;
end;
$$;

revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
