#!/usr/bin/env python3
"""Convert the extracted SIGAA table into the shared student record format."""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/data/sigaa-raw-table.json"
DESTINATION = ROOT / "src/data/sigaa-students.json"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold())
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    particles = {"de", "da", "do", "dos", "das", "e"}
    return " ".join(token for token in re.findall(r"[a-z0-9]+", value) if token not in particles)


def title_name(value: str) -> str:
    particles = {"de", "da", "do", "dos", "das", "e"}
    return " ".join(word.lower() if i and word.casefold() in particles else word[:1].upper() + word[1:].lower()
                     for i, word in enumerate(value.split()))


def main() -> None:
    rows = json.loads(SOURCE.read_text(encoding="utf-8"))
    if not rows or rows[0] != ["Matrícula", "Aluno"]:
        raise ValueError("Unexpected SIGAA raw table header")
    records = []
    seen = set()
    for row in rows[1:]:
        if len(row) != 2:
            raise ValueError(f"Malformed SIGAA row: {row!r}")
        matricula, name = (str(part).strip() for part in row)
        if not matricula or not name or matricula in seen:
            raise ValueError(f"Missing field or duplicate matrícula: {row!r}")
        seen.add(matricula)
        cohort_match = re.match(r"(20\d{2})", matricula)
        records.append({
            "matricula": matricula,
            "name": title_name(name),
            "normalizedName": normalize(name),
            **({"inferredCohort": cohort_match.group(1)} if cohort_match else {}),
        })
    DESTINATION.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} SIGAA students to {DESTINATION.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
