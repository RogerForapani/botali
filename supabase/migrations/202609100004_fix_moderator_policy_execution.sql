-- RLS policies call this helper while queries run as the authenticated role.
-- Keep every other private function inaccessible to clients.
grant usage on schema private to authenticated;
grant execute on function private.is_moderator() to authenticated;
