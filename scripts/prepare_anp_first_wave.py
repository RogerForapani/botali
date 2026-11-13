#!/usr/bin/env python3
"""Select a conservative 20-station ANP pilot and generate a guarded SQL import.

Inputs are a dated ANP snapshot and the two remaining community stations in
homologation. This script does not access or change the database.
"""

from __future__ import annotations

import argparse
from collections import Counter
import csv
from datetime import datetime
import json
import math
from pathlib import Path
import unicodedata
from uuid import NAMESPACE_URL, uuid5


PILOT_CITIES = (
    "BELO HORIZONTE", "CONTAGEM", "BETIM", "NOVA LIMA",
    "RIBEIRAO DAS NEVES", "SANTA LUZIA", "SABARA", "IBIRITE",
    "VESPASIANO", "LAGOA SANTA",
)
EXISTING = (
    (-19.9342703, -43.952643),  # Raízen, BH
    (-19.9251398, -44.0313247),  # Petrobras, Contagem
)
BRANDS = {
    "RAIZEN": "Raízen", "VIBRA": "Vibra", "IPIRANGA": "Ipiranga",
    "ALE": "Ale", "BANDEIRA BRANCA": "Independente",
}
FUELS = {
    "GASOLINA C COMUM": "gasolina",
    "GASOLINA C COMUM ADITIVADA": "gasolina_aditivada",
    "GASOLINA C PREMIUM": "gasolina_premium",
    "GASOLINA C PREMIUM ADITIVADA": "gasolina_premium",
    "ETANOL HIDRATADO COMUM": "etanol",
    "ETANOL HIDRATADO ADITIVADO": "etanol_aditivado",
    "OLEO DIESEL B S10 - COMUM": "diesel_s10",
    "OLEO DIESEL B S10 - ADITIVADO": "diesel_s10_aditivado",
    "OLEO DIESEL B S500 - COMUM": "diesel_s500",
    "OLEO DIESEL B S500 - ADITIVADO": "diesel_s500_aditivado",
    "GAS NATURAL VEICULAR": "gnv",
}


def plain(value: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFKD", value.upper())
                   if not unicodedata.combining(char))


def metres(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    term = math.sin(delta_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(delta_lon / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(term))


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def name(value: str) -> str:
    cleaned = value.strip().removesuffix(" LTDA").removesuffix(" LTDA.")
    return cleaned.title()[:120]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("candidates", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    with args.candidates.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream, delimiter=";"))
    coordinate_counts = Counter((r["latitude"], r["longitude"]) for r in rows
                                if r["latitude"] and r["longitude"])
    selected: list[dict[str, str]] = []
    for city in PILOT_CITIES:
        eligible = []
        for row in rows:
            if row["city"] != city or row["brand"] not in BRANDS:
                continue
            try:
                accuracy = float(row["coordinate_accuracy_m"].replace(",", "."))
                obtained = datetime.strptime(row["coordinate_obtained_at"], "%d/%m/%Y")
                point = (float(row["latitude"]), float(row["longitude"]))
            except (ValueError, TypeError):
                continue
            if accuracy > 10 or obtained.year < 2022:
                continue
            if coordinate_counts[(row["latitude"], row["longitude"])] != 1:
                continue
            if any(metres(point, other) < 150 for other in EXISTING):
                continue
            if not row["address"] or not row["cnpj"] or not row["anp_simp"]:
                continue
            eligible.append((obtained, accuracy, row))
        eligible.sort(key=lambda item: (-item[0].toordinal(), item[1], item[2]["cnpj"]))
        city_selected = 0
        for _, _, row in eligible:
            point = (float(row["latitude"]), float(row["longitude"]))
            if any(metres(point, (float(s["latitude"]), float(s["longitude"]))) < 150
                   for s in selected):
                continue
            selected.append(row)
            city_selected += 1
            if city_selected == 2:
                break
        if city_selected != 2:
            raise RuntimeError(f"Fewer than two eligible stations in {city}")
    if len(selected) != 20 or len({r["cnpj"] for r in selected}) != 20:
        raise RuntimeError("Pilot selection is incomplete or duplicated")

    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    csv_path = output / "anp-mg-first-wave-20.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(selected[0]), delimiter=";")
        writer.writeheader()
        writer.writerows(selected)

    sql_lines = [
        "-- 20 ANP records selected from a dated MG snapshot; homologation only.",
        "-- Apply migration 202611120001_anp_station_origin.sql first.",
        "\\set ON_ERROR_STOP on", "begin;", "set local lock_timeout = '10s';",
        "create temp table anp_wave (id uuid, simp text, cnpj text, anp_authorization text, name text, brand text, address text, neighborhood text, city text, postal_code text, latitude double precision, longitude double precision, accuracy numeric, obtained_on date, fuel_codes text[]) on commit drop;",
        "insert into anp_wave values",
    ]
    value_lines = []
    for row in selected:
        station_id = str(uuid5(NAMESPACE_URL, "botali:anp:" + row["cnpj"]))
        codes = sorted({FUELS[plain(p)] for p in row["fuel_products"].split(" | ") if plain(p) in FUELS})
        if not codes:
            raise RuntimeError("ANP station has no supported automotive fuel")
        values = [
            f"{sql(station_id)}::uuid", sql(row["anp_simp"]), sql(row["cnpj"]),
            sql(row["anp_authorization"]), sql(name(row["legal_name"])),
            sql(BRANDS[row["brand"]]), sql(row["address"].title()),
            sql(row["neighborhood"].title()), sql(row["city"].title()),
            sql(row["postal_code"]), row["latitude"], row["longitude"],
            row["coordinate_accuracy_m"].replace(",", "."),
            sql(datetime.strptime(row["coordinate_obtained_at"], "%d/%m/%Y").date().isoformat()) + "::date",
            "array[" + ",".join(sql(code) for code in codes) + "]::text[]",
        ]
        value_lines.append("  (" + ", ".join(values) + ")")
    sql_lines.append(",\n".join(value_lines) + ";")
    sql_lines.extend([
        "do $$ begin",
        "  if (select count(*) from anp_wave) <> 20 or (select count(distinct cnpj) from anp_wave) <> 20",
        "    or exists (select 1 from anp_wave w join public.stations s on s.id = w.id)",
        "    or exists (select 1 from anp_wave w join public.station_import_sources src on src.provider = 'ANP' and src.cnpj = w.cnpj)",
        "    or exists (select 1 from anp_wave w join public.stations s on extensions.st_dwithin(s.location, extensions.st_setsrid(extensions.st_makepoint(w.longitude,w.latitude),4326)::extensions.geography, 150))",
        "  then raise exception 'ANP first-wave inventory or distance changed'; end if;",
        "end $$;",
        "insert into public.stations (id,name,brand_id,latitude,longitude,address,neighborhood,city,state,postal_code,status,created_by,source_kind)",
        "select w.id,w.name,b.id,w.latitude,w.longitude,w.address,w.neighborhood,w.city,'MG',nullif(w.postal_code,''),'verified',null,'anp'",
        "from anp_wave w join public.station_brands b on b.name = w.brand;",
        "insert into public.station_import_sources (station_id,provider,external_id,cnpj,anp_authorization,source_url,coordinate_accuracy_m,coordinate_obtained_on,coordinate_reviewed)",
        "select id,'ANP',simp,cnpj,anp_authorization,'https://revendedoresapi.anp.gov.br/v1/combustivel',accuracy,obtained_on,false from anp_wave;",
        "insert into public.station_fuels (station_id,fuel_type_id)",
        "select w.id,f.id from anp_wave w cross join lateral unnest(w.fuel_codes) as code(name)",
        "join public.fuel_types f on f.code = code.name;",
        "do $$ begin",
        "  if (select count(*) from public.station_import_sources src join anp_wave w on w.id=src.station_id) <> 20",
        "     or exists (select 1 from public.price_submissions p join anp_wave w on w.id=p.station_id)",
        "  then raise exception 'ANP first-wave verification failed'; end if;",
        "end $$;",
        "select 'imported_anp_stations' as metric,count(*) from anp_wave;",
        "commit;",
    ])
    sql_path = output / "anp-mg-first-wave-20.sql"
    sql_path.write_text("\n".join(sql_lines) + "\n", encoding="utf-8")
    print(json.dumps({"stations": len(selected), "cities": len(PILOT_CITIES),
                      "csv": str(csv_path), "sql": str(sql_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
