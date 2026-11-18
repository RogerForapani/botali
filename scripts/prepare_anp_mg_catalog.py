#!/usr/bin/env python3
"""Generate a source catalog for all ANP MG records, including unmapped rows."""
import csv
import json
from pathlib import Path
import sys
from prepare_anp_first_wave import sql

source, output = map(Path, sys.argv[1:3])
with source.open(encoding="utf-8-sig", newline="") as stream:
    rows = list(csv.DictReader(stream, delimiter=";"))
if len(rows) != 5048 or len({row["cnpj"] for row in rows}) != 5048:
    raise RuntimeError("ANP snapshot inventory changed")
values = ["(" + ",".join([sql(row["cnpj"]), sql(row["anp_simp"]),
    sql(json.dumps(row, ensure_ascii=False, sort_keys=True)) + "::jsonb",
    sql(row["retrieved_at_utc"]) + "::timestamptz"]) + ")" for row in rows]
statements = ["\\set ON_ERROR_STOP on", "begin;", "set local lock_timeout='10s';",
    "insert into public.anp_station_catalog(cnpj,simp,source_record,retrieved_at_utc) values",
    ",\n".join(values) + " on conflict(cnpj) do update set simp=excluded.simp,source_record=excluded.source_record,retrieved_at_utc=excluded.retrieved_at_utc;",
    "update public.anp_station_catalog c set station_id=src.station_id, review_reason=null from public.station_import_sources src where src.provider='ANP' and src.cnpj=c.cnpj;",
    "update public.anp_station_catalog c set review_reason=case when source_record->>'latitude'='' then 'sem_coordenadas' when source_record->>'fuel_products' not like '%GASOLINA C%' and source_record->>'fuel_products' not like '%ETANOL HIDRATADO%' and source_record->>'fuel_products' not like '%DIESEL%' and source_record->>'fuel_products' not like '%NATURAL VEICULAR%' then 'sem_combustivel_rodoviario' else 'revisar_possivel_duplicidade' end where station_id is null;",
    "do $$ begin if (select count(*) from public.anp_station_catalog)<>5048 or (select count(*) from public.anp_station_catalog where station_id is not null)<>4625 then raise exception 'ANP catalog verification failed'; end if; end $$;",
    "select json_build_object('total',(select count(*) from public.anp_station_catalog),'mapped',(select count(*) from public.anp_station_catalog where station_id is not null),'review',(select count(*) from public.anp_station_catalog where station_id is null),'reasons',(select json_object_agg(review_reason,n) from (select review_reason,count(*) n from public.anp_station_catalog where station_id is null group by review_reason) x))::text;",
    "commit;"]
output.write_text("\n".join(statements)+"\n",encoding="utf-8")
print(f"Catalog SQL for {len(rows)} ANP rows: {output}")
