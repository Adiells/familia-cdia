# Project Status Report - Familia CDIA (CI / UFPB)

Last updated: 2026-11-19 23:59

## 1. Current State Summary

- **Live Local Server**: Running on `http://localhost:3000` (Next.js 16 production build).
- **Git Commits**:
  - `89f2eaddfb487ca74105286426b6f336c21f9e4b`: Initial Familia CDIA platform with SIGAA entity resolution and unified sponsorships.
  - `12c569b238dffc475dfe9d88df11cab1413262c4`: Default light theme, high-fps tree rendering, and mobile responsiveness.
  - `744eac05dd944f70d2c87ccbeb724a6bf33daf7d`: Add 2025.1 sponsorship pairings across 5 generations.
  - `b630db250084258c895dfe07a315bf5a1042f459`: Unify Samuel do Bem (`20240011249`) and eliminate edge overlap with Bezier fan-out and card z-index layering.

## 2. Dataset & Visual Highlights

- **98 Unique Students** across 5 generations (`2024.1`: 12, `2024.2`: 8, `2025.1`: 26, `2025.2`: 25, `2026.1`: 27) connected by **150 Sponsorship Links** (`75` pairings).
- **Zero Card-Edge Overlap**: `.react-flow__nodes` (`z-index: 10`) is strictly layered above `.react-flow__edges` (`z-index: 1`).
- **Bezier Fan-Out Routing**: Generous rank separation (`180px`) and node separation (`52px`) combined with per-edge cubic Bezier offsets (`sourceOffset`, `targetOffset`, `parallelOffset`) prevent collinear line stacking.
- **Lineage Focus Highlighting**:
  - Default view keeps all 150 edges subtle (`opacity: 0.24`).
  - Clicking a student fades non-lineage edges to `opacity: 0.04` and highlights upstream ancestor paths in **Emerald (`#10b981`)** and downstream descendant paths in **Sky Blue (`#0ea5e9`)** at `opacity: 1.0`.

## 3. Pending Matricula Confirmations (Optional)

- `Bia Barreto (2024.1)`, `Luana Cazé (2025.1)`, `Liliana (2025.1)`
- `João Gabriel Oliveira de Arruda (2025.1)`, `João Henrique de Araújo Pereira (2025.1)`
- `Matheus Rodrigues Henrique da Silva (2026.1)`, `Paula Gabriela Fernandes Agostinho (2026.1)`, `Joana Victoria Alves da Silva (2026.1)`
