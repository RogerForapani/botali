#!/usr/bin/env python3
"""Compare object inventories from a live snapshot and a local migration replay.

Matching names are necessary, but do not prove that definitions or data match.
"""

import argparse
from collections import Counter
from pathlib import Path
import re
import subprocess


KINDS = (
    "TABLE", "FUNCTION", "POLICY", "TRIGGER", "INDEX", "FK CONSTRAINT",
    "CONSTRAINT", "ROW SECURITY", "SEQUENCE", "VIEW", "MATERIALIZED VIEW",
)
ENTRY = re.compile(r"^\d+;\s+\d+\s+\d+\s+(.*?)\s+(public|private)\s+(.+?)\s+\S+$")


def objects(dump: Path) -> set[tuple[str, str, str]]:
    result = subprocess.run(["pg_restore", "--list", str(dump)], check=True,
                            capture_output=True, text=True)
    found = set()
    for line in result.stdout.splitlines():
        match = ENTRY.match(line)
        if match and match.group(1) in KINDS:
            found.add((match.group(1), match.group(2), match.group(3)))
    return found


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("live_dump", type=Path)
    parser.add_argument("candidate_dump", type=Path)
    args = parser.parse_args()
    live = objects(args.live_dump)
    candidate = objects(args.candidate_dump)
    for label, group in (("live", live), ("migrations", candidate)):
        counts = Counter(kind for kind, _, _ in group)
        print(f"{label}: " + ", ".join(f"{kind}={counts[kind]}" for kind in KINDS if counts[kind]))
    for label, group in (("only-live", live - candidate),
                         ("only-migrations", candidate - live)):
        print(f"{label}: {len(group)}")
        for kind, schema, name in sorted(group):
            print(f"  {kind}\t{schema}.{name}")


if __name__ == "__main__":
    main()
