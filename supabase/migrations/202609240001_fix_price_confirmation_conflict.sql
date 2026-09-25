-- Evita ambiguidade entre o parametro submission_id e a coluna do conflito.
-- Preserva a assinatura publica, as permissoes e as validacoes existentes.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.confirm_price_at_station(uuid,double precision,double precision,boolean)'::regprocedure
  );
begin
  if position('on conflict (submission_id, user_id)' in definition) > 0 then
    execute replace(definition,
      'on conflict (submission_id, user_id)',
      'on conflict on constraint price_confirmations_pkey');
  elsif position('on conflict on constraint price_confirmations_pkey' in definition) = 0 then
    raise exception 'Definicao de confirm_price_at_station inesperada: revisar antes de aplicar';
  end if;
end;
$migration$;
