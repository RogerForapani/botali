#!/usr/bin/env python3
"""Prepare a read-only Minas Gerais station review from the official ANP API.

This does not write to Supabase. ANP coordinates and fuel availability require
review before publication; no fuel prices are inferred from this dataset.
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request


API = "https://revendedoresapi.anp.gov.br/v1/combustivel"
FIELDS = (
    "anp_simp", "anp_authorization", "cnpj", "legal_name", "address",
    "complement", "neighborhood", "postal_code", "city", "state", "brand",
    "latitude", "longitude", "coordinate_validation", "coordinate_accuracy_m",
    "coordinate_srid", "coordinate_obtained_at", "fuel_products",
    "review_status", "source_url", "retrieved_at_utc",
)
PILOT_CITIES = (
    "BELO HORIZONTE", "CONTAGEM", "BETIM", "NOVA LIMA",
    "RIBEIRAO DAS NEVES", "SANTA LUZIA", "SABARA", "IBIRITE",
    "VESPASIANO", "LAGOA SANTA",
)


def fetch_page(page: int) -> dict:
    url = API + "?" + urllib.parse.urlencode({"uf": "MG", "numeropagina": page})
    request = urllib.request.Request(url, headers={"User-Agent": "Botali-ANP-review/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def coordinate(value: object, low: float, high: float) -> str:
    try:
        number = float(str(value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return ""
    if not low <= number <= high:
        return ""
    return f"{number:.8f}"


def normalize(item: dict, retrieved_at: str) -> dict[str, str]:
    latitude = coordinate(item.get("latitude"), -90, 90)
    longitude = coordinate(item.get("longitude"), -180, 180)
    products = item.get("produtos") or []
    return {
        "anp_simp": str(item.get("codigoSIMP") or "").strip(),
        "anp_authorization": str(item.get("autorizacao") or "").strip(),
        "cnpj": str(item.get("cnpj") or "").strip(),
        "legal_name": str(item.get("razaoSocial") or "").strip(),
        "address": str(item.get("endereco") or "").strip(),
        "complement": str(item.get("complemento") or "").strip(),
        "neighborhood": str(item.get("bairro") or "").strip(),
        "postal_code": str(item.get("cep") or "").strip(),
        "city": str(item.get("municipio") or "").strip(),
        "state": str(item.get("uf") or "").strip(),
        "brand": str(item.get("distribuidora") or "").strip(),
        "latitude": latitude,
        "longitude": longitude,
        "coordinate_validation": str(item.get("validacao") or "").strip(),
        "coordinate_accuracy_m": str(item.get("estimativaAcuracia") or "").strip(),
        "coordinate_srid": str(item.get("srid") or "").strip(),
        "coordinate_obtained_at": str(item.get("dataObtencao") or "").strip(),
        "fuel_products": " | ".join(sorted({
            str(product.get("produto") or "").strip()
            for product in products if isinstance(product, dict) and product.get("produto")
        })),
        "review_status": "coordinate_review" if latitude and longitude else "missing_coordinate",
        "source_url": API,
        "retrieved_at_utc": retrieved_at,
    }


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    first = fetch_page(1)
    page_info = first["searchPageFilter"]
    pages = int(page_info["totalPagina"])
    expected = int(page_info["totalRegistro"])
    items = list(first["data"])
    for page in range(2, pages + 1):
        result = fetch_page(page)
        if not result.get("succeeded") or int(result["searchPageFilter"]["totalRegistro"]) != expected:
            raise RuntimeError("ANP pagination changed during download")
        items.extend(result["data"])
    if len(items) != expected or not all(item.get("uf") == "MG" for item in items):
        raise RuntimeError("Incomplete or non-MG ANP response")

    retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    rows = [normalize(item, retrieved_at) for item in items]
    keys = [row["cnpj"] for row in rows]
    if not all(keys) or len(keys) != len(set(keys)):
        raise RuntimeError("Missing or duplicate CNPJ; review before export")
    rows.sort(key=lambda row: (row["city"], row["cnpj"]))

    full_path = output_dir / "anp-mg-candidates.csv"
    write_csv(full_path, rows)
    sample = []
    selected = set()
    for city in PILOT_CITIES:
        matches = [row for row in rows if row["city"] == city]
        for row in matches[:5]:
            sample.append(row)
            selected.add(row["cnpj"])
    for row in rows:
        if len(sample) >= 60:
            break
        if row["cnpj"] not in selected:
            sample.append(row)
            selected.add(row["cnpj"])
    sample_path = output_dir / "anp-mg-review-sample.csv"
    write_csv(sample_path, sample)

    cities = {row["city"] for row in rows}
    geocoded = sum(row["review_status"] == "coordinate_review" for row in rows)
    pilot = sum(row["city"] in PILOT_CITIES for row in rows)
    report = {
        "source": API,
        "retrieved_at_utc": retrieved_at,
        "state": "MG",
        "rows": len(rows),
        "municipalities": len(cities),
        "with_coordinates_unreviewed": geocoded,
        "missing_coordinates": len(rows) - geocoded,
        "pilot_10_municipalities": pilot,
        "sample_rows": len(sample),
        "contains_prices": False,
        "files": {
            full_path.name: {"sha256": digest(full_path), "bytes": full_path.stat().st_size},
            sample_path.name: {"sha256": digest(sample_path), "bytes": sample_path.stat().st_size},
        },
    }
    (output_dir / "anp-mg-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
