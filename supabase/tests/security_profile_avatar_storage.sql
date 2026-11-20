-- Run only against the disposable local migration replay.
-- Supabase's managed storage grants/RLS are simulated by this local stub.
begin;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, storage to anon, authenticated;
grant execute on function auth.uid() to authenticated;
grant select on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;
alter table storage.objects enable row level security;

insert into storage.objects (id, bucket_id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'profile-avatars', '11111111-1111-4111-8111-111111111111/avatar.jpg'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'profile-avatars', '22222222-2222-4222-8222-222222222222/avatar.jpg');

do $$ begin
  if (select public from storage.buckets where id = 'profile-avatars') then
    raise exception 'Avatar bucket is public';
  end if;
end $$;

set local role anon;
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'profile-avatars') <> 0 then
    raise exception 'Visitor can list avatar objects';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  if (select count(*) from storage.objects where bucket_id = 'profile-avatars') <> 1 then
    raise exception 'User can list another account avatar';
  end if;
  begin
    insert into storage.objects (id, bucket_id, name) values
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'profile-avatars', '22222222-2222-4222-8222-222222222222/other.jpg');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'User can upload into another account folder'; end if;

  update storage.objects set name = '11111111-1111-4111-8111-111111111111/stolen.jpg'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if found then raise exception 'User can move another account avatar'; end if;

  delete from storage.objects where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if found then raise exception 'User can delete another account avatar'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'profile-avatars') <> 1 then
    raise exception 'Second user can list another account avatar';
  end if;
end $$;
reset role;

rollback;
