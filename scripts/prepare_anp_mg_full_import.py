#!/usr/bin/env python3
"""Generate a guarded, repeatable MG import from the dated ANP review CSV."""
import argparse
import csv
from datetime import datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from prepare_anp_first_wave import FUELS, name, plain, sql

BRANDS = {"RAIZEN": "Raízen", "VIBRA": "Vibra", "IPIRANGA": "Ipiranga",
          "ALE": "Ale", "BANDEIRA BRANCA": "Independente"}

def fuel_codes(value: str) -> list[str]:
    found = set()
    for product in value.split(" | "):
        normalized = plain(product).replace("�LEO", "OLEO").replace("G�S", "GAS")
        if normalized in FUELS:
            found.add(FUELS[normalized])
    return sorted(found)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("sql_output", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    with args.snapshot.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream, delimiter=";"))
    if len(rows) != 5048 or len({r["cnpj"] for r in rows}) != len(rows) or any(r["state"] != "MG" for r in rows):
        raise RuntimeError("Snapshot ANP fora do inventário revisado")
    lines = ["\\set ON_ERROR_STOP on", "begin;", "set local lock_timeout = '10s';",
             "create temp table anp_mg_stage (id uuid, simp text, cnpj text, anp_authorization text, name text, brand text, address text, neighborhood text, city text, postal_code text, latitude double precision, longitude double precision, accuracy numeric, obtained_on date, fuel_codes text[]) on commit drop;",
             "insert into anp_mg_stage values"]
    values = []
    for row in rows:
        coords = [row["latitude"], row["longitude"]]
        if any(coords) and not all(coords):
            raise RuntimeError("Coordenada parcial")
        code_list = fuel_codes(row["fuel_products"])
        brand = BRANDS.get(row["brand"], row["brand"].title())
        date = datetime.strptime(row["coordinate_obtained_at"], "%d/%m/%Y").date().isoformat() if row["coordinate_obtained_at"] else None
        fields = [sql(str(uuid5(NAMESPACE_URL, "botali:anp:" + row["cnpj"]))) + "::uuid",
                  sql(row["anp_simp"]), sql(row["cnpj"]), sql(row["anp_authorization"]),
                  sql(name(row["legal_name"])), sql(brand), sql(row["address"].title()),
                  sql(row["neighborhood"].title()), sql(row["city"].title()),
                  sql(row["postal_code"]), coords[0] or "null", coords[1] or "null",
                  row["coordinate_accuracy_m"] or "null", sql(date) + "::date" if date else "null",
                  "array[" + ",".join(sql(c) for c in code_list) + "]::text[]"]
        values.append("(" + ",".join(fields) + ")")
    lines.append(",\n".join(values) + ";")
    lines += [
        "do $$ begin if (select count(*) from anp_mg_stage) <> 5048 or (select count(distinct cnpj) from anp_mg_stage) <> 5048 then raise exception 'ANP inventory mismatch'; end if; end $$;",
        "create temp table anp_mg_eligible on commit drop as select w.* from anp_mg_stage w where w.latitude is not null and w.longitude is not null and cardinality(w.fuel_codes)>0 and w.latitude between -23.5 and -14 and w.longitude between -51.5 and -39.5 and not exists (select 1 from public.station_import_sources src where src.provider='ANP' and src.cnpj=w.cnpj) and not exists (select 1 from public.stations s where s.source_kind='community' and extensions.st_dwithin(s.location,extensions.st_setsrid(extensions.st_makepoint(w.longitude,w.latitude),4326)::extensions.geography,50));",
        "select json_build_object('snapshot', (select count(*) from anp_mg_stage), 'with_coordinates', (select count(*) from anp_mg_stage where latitude is not null), 'already_imported', (select count(*) from anp_mg_stage w join public.station_import_sources src on src.provider='ANP' and src.cnpj=w.cnpj), 'eligible_new', (select count(*) from anp_mg_eligible), 'without_coordinates', (select count(*) from anp_mg_stage where latitude is null), 'without_car_fuel', (select count(*) from anp_mg_stage where cardinality(fuel_codes)=0), 'near_community', (select count(*) from anp_mg_stage w where w.latitude is not null and exists (select 1 from public.stations s where s.source_kind='community' and extensions.st_dwithin(s.location,extensions.st_setsrid(extensions.st_makepoint(w.longitude,w.latitude),4326)::extensions.geography,50))))::text;",
    ]
    if not args.dry_run:
        lines += [
            "insert into public.station_brands(name,operator_name) select distinct brand,'Cadastro ANP' from anp_mg_eligible on conflict(name) do nothing;",
            "insert into public.stations(id,name,brand_id,latitude,longitude,address,neighborhood,city,state,postal_code,status,created_by,source_kind) select w.id,w.name,b.id,w.latitude,w.longitude,w.address,w.neighborhood,w.city,'MG',nullif(w.postal_code,''),'verified',null,'anp' from anp_mg_eligible w join public.station_brands b on b.name=w.brand;",
            "insert into public.station_import_sources(station_id,provider,external_id,cnpj,anp_authorization,source_url,coordinate_accuracy_m,coordinate_obtained_on,coordinate_reviewed) select id,'ANP',simp,cnpj,anp_authorization,'https://revendedoresapi.anp.gov.br/v1/combustivel',accuracy,obtained_on,false from anp_mg_eligible;",
            "insert into public.station_fuels(station_id,fuel_type_id) select w.id,f.id from anp_mg_eligible w cross join lateral unnest(w.fuel_codes) code(name) join public.fuel_types f on f.code=code.name;",
            "do $$ begin if (select count(*) from public.station_import_sources src join anp_mg_eligible w on w.id=src.station_id) <> (select count(*) from anp_mg_eligible) or exists(select 1 from public.price_submissions p join anp_mg_eligible w on w.id=p.station_id) then raise exception 'ANP verification failed'; end if; end $$;",
            "select json_build_object('stations_total',(select count(*) from public.stations),'anp_total',(select count(*) from public.station_import_sources),'new_fuels',(select count(*) from public.station_fuels f join anp_mg_eligible w on w.id=f.station_id))::text;",
        ]
    lines.append("rollback;" if args.dry_run else "commit;")
    args.sql_output.parent.mkdir(parents=True, exist_ok=True)
    args.sql_output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Snapshot {len(rows)}; SQL {args.sql_output}; dry_run={args.dry_run}")

if __name__ == "__main__":
    main()
