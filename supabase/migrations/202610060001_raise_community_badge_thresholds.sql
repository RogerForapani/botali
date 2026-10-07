-- Torna as quatro conquistas comuns mais desafiadoras sem alterar níveis,
-- pontos, badge beta ou função de moderador.
-- Em homologação há um wrapper visual temporário; a regra original está em
-- my_community_profile_actual(). Em produção, a função tem o nome normal.

begin;

update public.community_badges
set title = case id
      when 'first-validated-price' then 'Preços confirmados'
      else title
    end,
    description = case id
      when 'first-validated-price' then 'Teve 3 preços confirmados por outras pessoas.'
      when 'community-checker' then 'Realizou pelo menos 20 confirmações de preço.'
      when 'station-scout' then 'Cadastrou 2 postos aprovados pela moderação.'
      when 'trusted-editor' then 'Teve 3 correções de posto aprovadas.'
    end
where id in ('first-validated-price', 'community-checker', 'station-scout', 'trusted-editor');

do $badge_rules$
declare
  target_function regprocedure;
  definition text;
begin
  if (select count(*) from public.community_badges
      where id in ('first-validated-price', 'community-checker', 'station-scout', 'trusted-editor')) <> 4 then
    raise exception 'Catálogo incompleto de badges comunitários';
  end if;

  target_function := coalesce(
    to_regprocedure('public.my_community_profile_actual()'),
    to_regprocedure('public.my_community_profile()')
  );
  if target_function is null then
    raise exception 'Função de perfil comunitário não encontrada';
  end if;
  definition := pg_get_functiondef(target_function);

  if position('level.validated_price_reports >= 3' in definition) > 0
     and position('level.price_confirmations >= 20' in definition) > 0
     and position('level.verified_stations >= 2' in definition) > 0
     and position('level.approved_edits >= 3' in definition) > 0 then
    return;
  end if;

  if position('level.validated_price_reports >= 1' in definition) = 0
     or position('level.price_confirmations >= 10' in definition) = 0
     or position('level.verified_stations >= 1' in definition) = 0
     or position('level.approved_edits >= 1' in definition) = 0 then
    raise exception 'Regras anteriores não correspondem à migração esperada';
  end if;

  definition := replace(definition, 'level.validated_price_reports >= 1', 'level.validated_price_reports >= 3');
  definition := replace(definition, 'level.price_confirmations >= 10', 'level.price_confirmations >= 20');
  definition := replace(definition, 'level.verified_stations >= 1', 'level.verified_stations >= 2');
  definition := replace(definition, 'level.approved_edits >= 1', 'level.approved_edits >= 3');
  execute definition;
end;
$badge_rules$;

commit;
