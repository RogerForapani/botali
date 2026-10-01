-- Avatares privados enviados pelo aplicativo. Cada usuario acessa somente a
-- propria pasta; o perfil guarda o caminho, nunca dados binarios ou base64.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 2097152, array['image/jpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists botali_profile_avatars_select_own on storage.objects;
create policy botali_profile_avatars_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists botali_profile_avatars_insert_own on storage.objects;
create policy botali_profile_avatars_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) = 'jpg'
);

drop policy if exists botali_profile_avatars_update_own on storage.objects;
create policy botali_profile_avatars_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) = 'jpg'
);

drop policy if exists botali_profile_avatars_delete_own on storage.objects;
create policy botali_profile_avatars_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

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
  current_user_id uuid := (select auth.uid());
  clean_name text := nullif(btrim(p_display_name), '');
  clean_avatar text := nullif(btrim(p_avatar_url), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 40 then
    raise exception 'Display name must have between 2 and 40 characters';
  end if;

  if clean_avatar is not null
     and char_length(clean_avatar) > 500 then
    raise exception 'Avatar reference is too long';
  end if;

  if clean_avatar is not null
     and clean_avatar !~ '^https://'
     and clean_avatar <> (current_user_id::text || '/avatar.jpg') then
    raise exception 'Invalid avatar reference';
  end if;

  update public.profiles
  set display_name = clean_name,
      avatar_url = clean_avatar,
      profile_is_public = coalesce(p_profile_is_public, false)
  where id = current_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke execute on function public.update_my_community_profile(text, text, boolean) from public, anon;
grant execute on function public.update_my_community_profile(text, text, boolean) to authenticated;
