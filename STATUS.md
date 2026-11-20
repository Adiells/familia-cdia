# Project Status Report - Familia CDIA (CI / UFPB)

Last updated: 2026-11-20 00:25

## 1. Current State Summary

- **Live Local Server**: Running on `http://localhost:3000` (Next.js 16 production build).
- **Git Commits**:
  - `89f2eaddfb487ca74105286426b6f336c21f9e4b`: Initial Familia CDIA platform with SIGAA entity resolution and unified sponsorships.
  - `12c569b238dffc475dfe9d88df11cab1413262c4`: Default light theme, high-fps tree rendering, and mobile responsiveness.
  - `744eac05dd944f70d2c87ccbeb724a6bf33daf7d`: Add 2025.1 sponsorship pairings across 5 generations.
  - `b630db250084258c895dfe07a315bf5a1042f459`: Unify Samuel do Bem (`20240011249`) and eliminate edge overlap with Bezier fan-out and card z-index layering.
  - `9993299a5f445f017f4ad5a73a385b34d450c949` (`tag: v1-cohort-layers`): Snapshot before organic genealogical tree experiment.
  - `4f9b7f906350858b64901cf4cec17e3449a573d3`: Restore cohort-layered layout, declutter duplicate/mobile filters, add variable-count godparents (`1+`), set João Henrique de Araújo Pereira to `2021.2`, and add `2026.2` sponsorships.

## 2. Dataset & Visual Highlights

- **118 Unique Students** across 7 cohorts (`2021.2`: 1, `2024.1`: 12, `2024.2`: 8, `2025.1`: 26, `2025.2`: 25, `2026.1`: 27, `2026.2`: 19) connected by **188 Sponsorship Links** (`94` pairings).
- **Cohort-Layered Layout + Bezier Fan-Out Routing**:
  - Stratified horizontal/vertical tiers by cohort semester with 2-pass barycenter crossing minimization (`DEFAULT_RANK_SEP = 180px`, `DEFAULT_NODE_SEP = 52px`).
  - Cards strictly layered above edges (`.react-flow__nodes { z-index: 10 }` vs `.react-flow__edges { z-index: 1 }`).
  - Custom cubic Bezier curves with per-edge `sourceOffset`, `targetOffset`, and `parallelOffset`.
- **Decluttered Controls & Mobile Ergonomics**:
  - Removed duplicate cohort filter from inside the tree canvas (`TreeControls.tsx`).
  - Compacted mobile `StatsBar.tsx` into a single 3-column row and a single-line horizontally scrollable cohort filter strip.
- **Flexible Sponsorship Ingestion (`1+` Godparents)**:
  - Manual form and CSV/JSON batch import in `AddSponsorshipModal.tsx` and `/api/sponsorships` support `1` or more godparents per student.
