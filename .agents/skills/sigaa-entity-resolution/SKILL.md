---
name: sigaa-entity-resolution
description: >-
  Reconcile student names from CDIA sponsorship records against the official UFPB SIGAA active students list (id=14289031). Use when scraping SIGAA, parsing sponsorship records, normalizing Portuguese names, or deduplicating student nodes.
---

# SIGAA Entity Resolution

Procedure for extracting active CDIA students from SIGAA UFPB and deduplicating sponsorship records into canonical graph data.

## 1. SIGAA Data Extraction

- **Target URL**: `https://sigaa.ufpb.br/sigaa/public/curso/alunos.jsf?lc=pt_BR&id=14289031`
- **Extraction**:
  1. Parse active student rows (`matricula`, `name`) via `scripts/scrape_sigaa.py`.
  2. Infer entry year from the 4-digit `matricula` prefix (`2024`, `2025`, `2026`).
  3. Output canonical list to `src/data/sigaa-students.json`.

## 2. Name Normalization

1. Strip parenthetical metadata from raw strings before matching:
   - Cohort tags: `(2021.2)`, `(2022.1)`, `(2024.1)`, `(2024.2)`, `(2025.1)`, `(2025.2)`, `(2026.1)`, `(2026.2)`.
   - Disambiguation notes: `(Cajazeiras)` -> store in `notes`.
2. Normalize Unicode: lowercase, strip diacritics via `NFKD`, remove punctuation, and filter Portuguese stopword particles (`de`, `da`, `do`, `dos`, `das`, `e`).
3. Apply title-case formatting to raw names.

## 3. Multi-Tier Matching Rules

Match every raw name from `src/data/raw-pdf-sponsorships.json` against `sigaa-students.json` and across cohorts in strict order:

1. **Confirmed Alias Lookup (`CONFIRMED_MATRICULAS`)**: Direct mapping for known nicknames (e.g., `Samuel do Bem` -> `20240011249`, `Sarah Ari` -> `20260011881`, `Beatriz Cruz` -> `20240011060`, `Artur Almeida` -> `20250018637`, `Hélio Júnior` -> `20260011765`).
2. **Exact Normalized Match (`EXACT`)**: All normalized tokens match an official SIGAA record.
3. **Ordered Token Subset and Initial Expansion (`TOKEN_SUBSET`)**:
   - Tokens of the shorter name form an ordered subset of the full name, or abbreviated middle initials (e.g., `F.`) match the corresponding token initial.
   - Disambiguate multiple candidates using the 4-digit entry year from the cohort tag against the SIGAA `matricula` prefix.
4. **Fuzzy Orthographic Match (`FUZZY`)**:
   - Token similarity >= 0.86 to merge minor spelling differences (`Borraz` vs `Borrás`, `Eloisa` vs `Eloísa`).
5. **Fallback (`PDF_ONLY`)**:
   - If a veteran or student is not on the active SIGAA page, unify across records and mark `sigaaVerified: false`, `matchConfidence: "PDF_ONLY"`.

## 4. Verification

Run `node scripts/validate_graph.mjs` to assert:
- Zero duplicate student nodes across all pairings.
- Every `godparentId` and `godchildId` in `src/data/sponsorships.json` resolves to a valid ID in `src/data/students.json`.
- The directed graph contains no cycles.
