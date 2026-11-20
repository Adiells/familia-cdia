---
name: sigaa-entity-resolution
description: >-
  Reconcile student names from CDIA sponsorship PDFs against the official UFPB SIGAA active students list (id=14289031). Use when scraping SIGAA, parsing sponsorship PDFs, normalizing Portuguese names, or deduplicating student records.
---

# SIGAA Entity Resolution

Procedure for extracting active CDIA students from SIGAA UFPB and deduplicating sponsorship PDF records into canonical graph data.

## 1. SIGAA Data Extraction

- **Target URL**: `https://sigaa.ufpb.br/sigaa/public/curso/alunos.jsf?lc=pt_BR&id=14289031`
- **Extraction**:
  1. Read HTML from the connected Maestri portal (`maestri portal html "SIGAA Portal"`) or fetch directly via `scripts/scrape_sigaa.py`.
  2. Parse active student rows (`matricula`, `name`).
  3. Infer entry year/cohort from the `matricula` prefix (`2024`, `2025`, `2026`) when explicit cohort metadata is absent.
  4. Output canonical list to `src/data/sigaa-students.json`.

## 2. Name Normalization

1. Strip parenthetical metadata from raw strings before matching:
   - Cohort tags: `(2024.1)`, `(2024.2)`, `(2025.1)`, `(2025.2)`.
   - Disambiguation notes: `(Cajazeiras)` -> store in `notes`.
2. Normalize Unicode: lowercase, strip diacritics via `NFKD`, remove punctuation, and filter Portuguese stopword particles (`de`, `da`, `do`, `dos`, `das`, `e`).
3. Apply title-case formatting to poorly cased raw names (e.g., `sophia de carvalho beltrão` -> `Sophia de Carvalho Beltrão`).

## 3. Multi-Tier Matching Rules

Match every raw name from `src/data/raw-pdf-sponsorships.json` against `sigaa-students.json` and across both PDFs in strict order:

1. **Exact Normalized Match (`EXACT`)**: All normalized tokens match an official SIGAA record.
2. **Ordered Token Subset and Initial Expansion (`TOKEN_SUBSET`)**:
   - Tokens of the shorter name form an ordered subset of the full name, or abbreviated middle initials (e.g., `F.`) match the corresponding token initial.
   - Must unify known cross-PDF aliases including:
     - `Adiel` == `Adiel Emilson`
     - `Igor Mendonça` == `Igor Mendonça de Souza`
     - `Mikael Rodrigues` == `Mikael Rodrigues dos Santos`
     - `Maria Rita` == `Maria Rita dos Santos Silva`
     - `Elton de Assis` == `Elton de Assis Guedes Neto`
     - `Cauã Lacerda` == `Cauã Henrique F. de Lacerda`
     - `Matheus Nunes` == `Matheus da Silva Nunes`
     - `Paulo Henrique Fernandes` == `Paulo Henrique Nunes Fernandes e Silva`
3. **Fuzzy Orthographic Match (`FUZZY`)**:
   - Token similarity >= 0.86 to merge minor spelling differences such as `Pedro Borraz Souto` vs `Pedro Borrás Souto` and `Maria Eloisa` vs `Maria Eloísa`.
4. **Fallback (`PDF_ONLY`)**:
   - If a veteran is no longer on the active SIGAA page, unify across PDFs and mark `sigaaVerified: false`, `matchConfidence: "PDF_ONLY"`.

## 4. Verification

Run `node scripts/validate_graph.mjs` to assert:
- Zero duplicate student nodes across all 25 pairings from `2025.2` and 27 pairings from `2026.1`.
- Every `godparentId` and `godchildId` in `src/data/sponsorships.json` resolves to a valid ID in `src/data/students.json`.
- The directed graph contains no cycles.
