#!/usr/bin/env python3
"""Compare migration seed catalog values with a live pg_dump COPY extract."""

import argparse
from pathlib import Path
import re


COPY = re.compile(r"^COPY public\.(\w+) \((.+)\) FROM stdin;$")
FIELDS = {
    "fuel_types": ("code", "name", "active"),
    "services": ("code", "name", "active"),
    "station_brands": ("name", "operator_name", "active"),
    "community_badges": ("id", "title", "description", "icon_name", "accent_color", "sort_order"),
    # starts_at is seeded with now() and necessarily differs between runs.
    "community_programs": ("id", "badge_id", "enrollment_open", "ends_at"),
}


def read(path: Path) -> dict[str, set[tuple[str, ...]]]:
    rows = {table: set() for table in FIELDS}
    table = None
    indices = []
    for line in path.read_text(encoding="utf-8").splitlines():
        match = COPY.match(line)
        if match:
            table = match.group(1) if match.group(1) in FIELDS else None
            columns = [part.strip() for part in match.group(2).split(",")]
            indices = [columns.index(field) for field in FIELDS[table]] if table else []
        elif line == r"\.":
            table = None
        elif table:
            parts = line.split("\t")
            rows[table].add(tuple(parts[index] for index in indices))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("live_data", type=Path)
    parser.add_argument("candidate_data", type=Path)
    args = parser.parse_args()
    live = read(args.live_data)
    candidate = read(args.candidate_data)
    for table in FIELDS:
        missing = live[table] - candidate[table]
        extra = candidate[table] - live[table]
        print(f"{table}: live={len(live[table])}, migrations={len(candidate[table])}, "
              f"only-live={len(missing)}, only-migrations={len(extra)}")
        for row in sorted(missing):
            print(f"  only-live: {row}")
        for row in sorted(extra):
            print(f"  only-migrations: {row}")


if __name__ == "__main__":
    main()
