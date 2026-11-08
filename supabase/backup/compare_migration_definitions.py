#!/usr/bin/env python3
"""Compare pg_dump schema sections from the live backup and migration replay."""

import argparse
import difflib
from pathlib import Path
import re


HEADER = re.compile(r"^-- Name: (.+); Type: (.+); Schema: (public|private|auth|storage); Owner: -$")
QUOTED = re.compile(r"'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"")
KINDS = {"TABLE", "FUNCTION", "POLICY", "TRIGGER", "INDEX", "FK CONSTRAINT",
         "CONSTRAINT", "ROW SECURITY", "SEQUENCE"}


def sections(path: Path) -> dict[tuple[str, str, str], str]:
    found = {}
    key = None
    lines = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("-- PostgreSQL database dump complete"):
            break
        match = HEADER.match(line)
        if match:
            if key:
                found[key] = "\n".join(lines).strip()
            name, kind, schema = match.groups()
            key = (kind, schema, name) if kind in KINDS else None
            lines = []
        elif key:
            lines.append(line)
    if key:
        found[key] = "\n".join(lines).strip()
    return found


def compact_sql(value: str) -> str:
    """Ignore layout while preserving quoted string and identifier contents."""
    pieces = []
    cursor = 0
    for match in QUOTED.finditer(value):
        pieces.append(re.sub(r"\s+", "", value[cursor:match.start()]))
        pieces.append(match.group())
        cursor = match.end()
    pieces.append(re.sub(r"\s+", "", value[cursor:]))
    return "".join(pieces)


def equivalent(key: tuple[str, str, str], left: str, right: str) -> bool:
    left, right = compact_sql(left), compact_sql(right)
    if key[0] == "POLICY":
        # PostgreSQL prints the same role set in insertion order.
        role_set = re.compile(r"TO((?:anon|authenticated|service_role)(?:,(?:anon|authenticated|service_role))*)")
        left = role_set.sub(lambda match: "TO" + ",".join(sorted(match.group(1).split(","))), left)
        right = role_set.sub(lambda match: "TO" + ",".join(sorted(match.group(1).split(","))), right)
    return left == right


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("live_schema", type=Path)
    parser.add_argument("candidate_schema", type=Path)
    parser.add_argument("--show-diff", action="store_true")
    parser.add_argument("--managed-botali", action="store_true")
    args = parser.parse_args()
    live = sections(args.live_schema)
    candidate = sections(args.candidate_schema)
    if args.managed_botali:
        keep = lambda key: ((key[0] == "TRIGGER" and key[1] == "auth" and
                             key[2] == "users on_auth_user_created") or
                            (key[0] == "POLICY" and key[1] == "storage" and
                             "botali_profile_avatars_" in key[2]))
        live = {key: value for key, value in live.items() if keep(key)}
        candidate = {key: value for key, value in candidate.items() if keep(key)}
    for key in sorted(live.keys() & candidate.keys()):
        if live[key] != candidate[key]:
            print(("EQUIVALENT" if equivalent(key, live[key], candidate[key])
                   else "DIFF") + "\t" + "\t".join(key))
            if args.show_diff:
                diff = difflib.unified_diff(live[key].splitlines(), candidate[key].splitlines(),
                                            fromfile="live", tofile="migrations", lineterm="")
                for line in list(diff)[:36]:
                    print(line)
    for label, group in (("ONLY_LIVE", live.keys() - candidate.keys()),
                         ("ONLY_MIGRATIONS", candidate.keys() - live.keys())):
        for key in sorted(group):
            print(label + "\t" + "\t".join(key))
    print(f"Sections: live={len(live)}, migrations={len(candidate)}")


if __name__ == "__main__":
    main()
