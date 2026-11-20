#!/usr/bin/env python3
"""Resolve PDF sponsorship names to SIGAA identities and emit graph data."""
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data"
STOP = {"de", "da", "do", "dos", "das", "e"}
CANONICAL_SPELLING = {
    "sophia carvalho beltrao": "Sophia de Carvalho Beltrão",
    "pedro borras souto": "Pedro Borrás Souto",
    "maria eloisa": "Maria Eloísa",
}
PDF_CANONICAL_NAMES = {
    "bia barreto": "Beatriz Barreto Cavalcanti",
}
# Confirmed identity aliases that differ too much for name-based matching.
CONFIRMED_MATRICULAS = {
    "samuel bem": "20240011249",
    "sarah ari": "20260011881",
    "beatriz cruz": "20240011060",
    "artur almeida": "20250018637",
    "helio junior": "20260011765",
}


def normalize(text):
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return [token for token in re.findall(r"[a-z0-9]+", text) if token not in STOP]


def title_name(name):
    small = {"de", "da", "do", "dos", "das", "e"}
    return " ".join(word.lower() if i and word.casefold() in small else word[:1].upper() + word[1:].lower()
                     for i, word in enumerate(name.split()))


def unwrap(raw):
    notes = []
    cohort = None
    def replace(match):
        nonlocal cohort
        value = match.group(1).strip()
        if re.fullmatch(r"20\d{2}\.\d", value):
            cohort = value
        else:
            notes.append(value)
        return ""
    return re.sub(r"\(([^()]*)\)", replace, raw).strip(), cohort, notes


def subset_match(a, b):
    """Ordered token subset, with initials matching a corresponding token."""
    if not a or not b:
        return False
    def fits(short, long):
        cursor = 0
        for token in short:
            while cursor < len(long) and not (long[cursor] == token or (len(token) == 1 and long[cursor].startswith(token))):
                cursor += 1
            if cursor == len(long):
                return False
            cursor += 1
        return True
    return fits(a, b) or fits(b, a)


def slug(name):
    return "-".join(normalize(name))


def main():
    sigaa = json.loads((DATA / "sigaa-students.json").read_text(encoding="utf-8"))
    raw = json.loads((DATA / "raw-pdf-sponsorships.json").read_text(encoding="utf-8"))
    people, audit, edges = [], [], []
    by_id = {}
    # Group identities first so later PDF spellings can enrich earlier records.
    def resolve(raw_name, assumed_cohort):
        name, tagged_cohort, notes = unwrap(raw_name)
        cohort = tagged_cohort or assumed_cohort
        tokens = normalize(name)
        if not tokens:
            raise ValueError(f"Empty student name: {raw_name!r}")
        candidates = []
        for record in sigaa:
            rt = normalize(record["name"])
            if tokens == rt:
                candidates.append((0, record, "EXACT"))
            elif subset_match(tokens, rt):
                candidates.append((1, record, "TOKEN_SUBSET"))
            else:
                ratio = SequenceMatcher(None, " ".join(tokens), " ".join(rt)).ratio()
                if ratio >= 0.86:
                    candidates.append((2, record, "FUZZY"))
        confirmed_matricula = CONFIRMED_MATRICULAS.get(" ".join(tokens))
        if confirmed_matricula:
            confirmed_records = [record for record in sigaa if record["matricula"] == confirmed_matricula]
            if len(confirmed_records) != 1:
                raise ValueError(f"Confirmed matrícula {confirmed_matricula} for {raw_name!r} is missing or ambiguous")
            candidates = [(1, confirmed_records[0], "TOKEN_SUBSET")]
        # PDF cohort tags identify the student's entry year. Short names can
        # match several active students, so use the matrícula prefix to
        # disambiguate before deciding whether the best tier is unique.
        entry_year = (tagged_cohort or assumed_cohort or "")[:4]
        year_candidates = [candidate for candidate in candidates
                           if candidate[1]["matricula"].startswith(entry_year)] if re.fullmatch(r"20\d{2}", entry_year) else []
        if year_candidates:
            candidates = year_candidates
        # Resolve only a unique best official record; ambiguity must not silently merge identities.
        candidates.sort(key=lambda item: item[0])
        official = None
        confidence = "PDF_ONLY"
        if candidates:
            best_tier = candidates[0][0]
            best = [item for item in candidates if item[0] == best_tier]
            if len(best) == 1:
                _, official, confidence = best[0]

        # Existing records also provide cross-PDF resolution for inactive veterans.
        existing = []
        for person in people:
            pt = normalize(person["canonicalName"])
            if tokens == pt or subset_match(tokens, pt):
                existing.append(person)
            elif SequenceMatcher(None, " ".join(tokens), " ".join(pt)).ratio() >= 0.90:
                existing.append(person)
        if official:
            key = "sigaa:" + official["matricula"]
            confidence = "EXACT" if tokens == normalize(official["name"]) else confidence
        elif existing:
            if len(existing) > 1:
                raise ValueError(f"Ambiguous PDF-only match for {raw_name!r}")
            key = "pdf:" + " ".join(normalize(existing[0]["canonicalName"]))
            by_id[key] = existing[0]["id"]
        else:
            key = "pdf:" + " ".join(tokens)
        if key not in by_id:
            canonical = (
                CANONICAL_SPELLING.get(" ".join(normalize(official["name"])), official["name"])
                if official else PDF_CANONICAL_NAMES.get(" ".join(tokens), title_name(name))
            )
            ident = slug(canonical)
            if ident in {p["id"] for p in people}:
                ident += "-" + (official["matricula"][-4:] if official else str(len(people) + 1))
            by_id[key] = ident
            people.append({
                "id": ident, "canonicalName": canonical, "displayName": canonical,
                "matricula": official["matricula"] if official else None,
                "cohort": cohort or ((official.get("inferredCohort", "") + ".1") if official else "unknown"),
                "aliases": [], "sigaaVerified": bool(official), "matchConfidence": confidence,
                **({"notes": "; ".join(notes)} if notes else {}),
            })
        person = next(p for p in people if p["id"] == by_id[key])
        if raw_name not in person["aliases"] and raw_name != person["canonicalName"]:
            person["aliases"].append(raw_name)
        if cohort and person["cohort"] == "unknown":
            person["cohort"] = cohort
        if notes:
            person["notes"] = "; ".join(dict.fromkeys(filter(None, [person.get("notes"), *notes])))
        return person, name, confidence, official

    sources = [("sponsorships_2025_1", "2025.1", "sponsorships_2025_1_source"),
               ("sponsorships_2025_2", "2025.2", "pdf_2025_2_source"),
               ("sponsorships_2026_1", "2026.1", "pdf_2026_1_source"),
               ("sponsorships_2026_2", "2026.2", "sponsorships_2026_2_source")]
    for key, semester, source_key in sources:
        source = raw[source_key]
        for row in raw[key]:
            # Semester tags are authoritative. The incoming cohort and role
            # determine fallbacks when a raw row omits a semester tag.
            child, child_name, child_conf, child_official = resolve(row["godchild"], semester)
            p2_fallback = {"2025.1": "2024.2", "2025.2": "2025.1", "2026.1": "2025.2", "2026.2": "2026.1"}[semester]
            p2, p2_name, p2_conf, p2_official = resolve(row["p2"], p2_fallback)
            veteran_fallback = {"2025.1": "2024.1", "2025.2": "2024.1", "2026.1": "2025.1", "2026.2": "2025.2"}[semester]
            veteran, veteran_name, veteran_conf, veteran_official = resolve(row["veterano"], veteran_fallback)
            for raw_name, person, resolved_name, confidence, official in [
                (row["godchild"], child, child_name, child_conf, child_official),
                (row["p2"], p2, p2_name, p2_conf, p2_official),
                (row["veterano"], veteran, veteran_name, veteran_conf, veteran_official),
            ]:
                audit.append({"rawName": raw_name, "sourceDoc": source, "resolvedStudentId": person["id"],
                              "canonicalName": person["canonicalName"], "matricula": person["matricula"],
                              "matchConfidence": confidence,
                              "explanation": ("Matched official SIGAA record" if official else "Resolved from sponsorship PDFs; absent from active SIGAA roster")})
            for person, role in ((p2, "P2"), (veteran, "VETERANO")):
                edges.append({"id": f"{semester}-{role.lower()}-{person['id']}-{child['id']}",
                              "godparentId": person["id"], "godchildId": child["id"],
                              "role": role, "semester": semester, "sourceDoc": source})

    (DATA / "students.json").write_text(json.dumps(people, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DATA / "sponsorships.json").write_text(json.dumps(edges, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DATA / "reconciliation-audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Reconciled {len(people)} students, {len(edges)} edges, {len(audit)} name records")


if __name__ == "__main__":
    main()
