# Project Status Report - Familia CDIA (CI / UFPB)

Last updated: 2026-11-19

## 1. Executive Summary

The **Familia CDIA** platform (academic genealogy and sponsorship tree for the Data Science and Artificial Intelligence degree at UFPB, inspired by [Aquario UFPB](https://www.aquarioufpb.com/)) has its core architecture, data reconciliation pipeline, multi-agent governance, and UI views implemented and running on `http://localhost:3000`.

---

## 2. Completed Work (Done)

### 2.1 Governance, Skills, and Multi-Agent Orchestration (Maestri)
- **Project Guidelines**: Created [AGENTS.md](./AGENTS.md) and [GEMINI.md](./GEMINI.md) in concise, conventional English without emojis.
- **Specialized Project Skills** (`.agents/skills/`):
  - `sigaa-entity-resolution`: [SKILL.md](./.agents/skills/sigaa-entity-resolution/SKILL.md)
  - `aquario-ui-design`: [SKILL.md](./.agents/skills/aquario-ui-design/SKILL.md)
  - `cdia-tree-engine`: [SKILL.md](./.agents/skills/cdia-tree-engine/SKILL.md)
- **Maestri Squad**:
  - **Khipu** (`Codex` - Data & SIGAA Engineer)
  - **Coral** (`Antigravity` / `claude-sonnet-5-5-high` - Aquario UI Architect)
  - **Yggdrasil** (`Antigravity` / `gemini-4-argon-high` - Tree & Graph Specialist)
  - **Aegis** (`Codex` - Search, Admin & QA Engineer)
  - Shared Sticky Note: `familia-cdia-spec`
  - Browser Portals: `SIGAA Portal` and `Familia CDIA Preview` (`http://localhost:3000`)

### 2.2 SIGAA Data Extraction & Entity Resolution (`Khipu`)
- **Official SIGAA Roster**: Extracted **284 active students** from `https://sigaa.ufpb.br/sigaa/public/curso/alunos.jsf?lc=pt_BR&id=14289031` into [src/data/sigaa-students.json](./src/data/sigaa-students.json) via [scripts/scrape_sigaa.py](./scripts/scrape_sigaa.py).
- **Multi-PDF Reconciliation**: Processed all **52 sponsorship pairings** (`25` from `apadrinhamento-2025-11-08 (3).pdf` and `27` from `Resultado Apadrinhamento - Página1-1.pdf`) via [scripts/reconcile_data.py](./scripts/reconcile_data.py).
- **Zero-Duplicate Graph Outputs**:
  - **85 unique student nodes** in [src/data/students.json](./src/data/students.json) (`78` verified as currently active in SIGAA with official `matricula`, `7` historical PDF records).
  - **104 directed sponsorship edges** (`52` P2 edges + `52` Veterano edges) in [src/data/sponsorships.json](./src/data/sponsorships.json).
  - **156 transparent audit entries** in [src/data/reconciliation-audit.json](./src/data/reconciliation-audit.json) documenting how every raw name variation (`Adiel` -> `Adiel Emilson da Silva`, `Pedro Borraz Souto` -> `Pedro Borras Souto`, `Mikael Rodrigues` -> `Mikael Rodrigues dos Santos`, `Igor Mendonça` -> `Igor Mendonca de Souza`, `Cauã Lacerda` -> `Caua Henrique Formiga de Lacerda`, `Maria Rita` -> `Maria Rita dos Santos Silva`, etc.) was unified.
- **Automated Graph Validation**: [scripts/validate_graph.mjs](./scripts/validate_graph.mjs) passes with 0 duplicate IDs, 100% referential integrity, and acyclic DAG verification.

### 2.3 Aquario UFPB Design System & Shell (`Coral`)
- **Next.js 16 + TypeScript (`strict: true`) + Tailwind CSS v4** initialized and passing production build (`npm run build`).
- **Visual Identity**: Oceanic dark theme (`bg-slate-950`, glassmorphic panels, semantic cohort badges for `2024.1`, `2024.2`, `2025.1`, `2025.2`, `2026.1`) with dark/light toggle in [src/app/globals.css](./src/app/globals.css) and [src/app/layout.tsx](./src/app/layout.tsx).
- **Layout & Profile Drawer**:
  - [src/components/layout/Header.tsx](./src/components/layout/Header.tsx): Navigation across 4 views (`Árvore Interativa`, `Explorador de Linhagens`, `Diretório SIGAA`, `Auditoria & Dados`), global search trigger (`Cmd+K`), theme toggle, and `+ Novo Apadrinhamento`.
  - [src/components/layout/StatsBar.tsx](./src/components/layout/StatsBar.tsx): Live metrics and clickable cohort filter chips.
  - [src/components/student/StudentDrawer.tsx](./src/components/student/StudentDrawer.tsx): Slide-over profile drawer displaying canonical SIGAA name, `matricula`, P2 godparent, Veterano godparent, direct godchildren, total lineage descendants, unified PDF aliases, and `"Focar na Linhagem"` action.

### 2.4 Interactive DAG & Multi-Generational Tree Engine (`Yggdrasil`)
- **Stratified DAG Layout**: [src/lib/graph-layout.ts](./src/lib/graph-layout.ts) implements cohort-tier alignment (`2024.1` -> `2026.1`), Dagre + barycenter crossing minimization, recursive ancestor/descendant traversal, and family metrics calculation (identifying largest lineages such as *Maria Eloisa Silva de Sousa* and *Sofia Pontes Leitao de Lima* with 8 descendants each).
- **React Flow Components**:
  - [src/components/tree/StudentNode.tsx](./src/components/tree/StudentNode.tsx)
  - [src/components/tree/SponsorshipEdge.tsx](./src/components/tree/SponsorshipEdge.tsx) (solid sky-blue for `P2`, dashed violet for `VETERANO`)
  - [src/components/tree/TreeControls.tsx](./src/components/tree/TreeControls.tsx)
  - [src/components/tree/FamilyTreeCanvas.tsx](./src/components/tree/FamilyTreeCanvas.tsx)

### 2.5 Global Search, SIGAA-Backed Ingestion & Audit Views (`Aegis`)
- **Fuzzy Search**: [src/lib/search.ts](./src/lib/search.ts) and [src/components/search/CommandSearch.tsx](./src/components/search/CommandSearch.tsx) (`Cmd+K` / `Ctrl+K` modal searching official SIGAA names, PDF aliases, matriculas, and cohorts).
- **New Sponsorship Ingestion**: [src/components/admin/AddSponsorshipModal.tsx](./src/components/admin/AddSponsorshipModal.tsx) with live autocomplete against all 284 active SIGAA students, single trio or batch CSV/JSON import, `localStorage` persistence, and JSON export.
- **Reconciliation Audit**: [src/components/admin/SigaaAuditModal.tsx](./src/components/admin/SigaaAuditModal.tsx) + dedicated `Diretório SIGAA` and `Auditoria & Dados` tabs integrated in [src/app/page.tsx](./src/app/page.tsx).

---

## 3. Remaining / Recommended Next Steps (To Do When Back Online)

1. **Visual Verification & Fine-Tuning of the React Flow Canvas**:
   - We fixed the React Flow container height in [src/components/tree/FamilyTreeCanvas.tsx](./src/components/tree/FamilyTreeCanvas.tsx) (`618px` height confirmed in DOM). Because the headless portal window can throttle WebGL/canvas repaints when unfocused, open `http://localhost:3000` (or the `Familia CDIA Preview` portal on the Maestri canvas) directly to inspect node spacing, edge routing, and zoom defaults.
2. **Investigate the 7 `PDF_ONLY` Records**:
   - Out of 85 students in the PDFs, 78 matched the active SIGAA roster automatically (`91.8%` match rate). The remaining 7 (`Ana Beatriz (2024.2)`, `Pedro Lucas (Cajazeiras) (2025.1)`, `João Gabriel Oliveira de Arruda (2025.1)`, `João Meireles (2024.2)`, `João Costa (2024.1)`, `João Henrique de Araújo Pereira (2025.1)`, `Lucas Oliveira`) were either abbreviated nicknames (e.g., `João Meireles` likely maps to `JOAO VICTOR DE SOUZA LUCENA MEIRELES` (`20240102290`), `João Costa` likely maps to `JOAO VITOR PEREIRA DA COSTA` (`20240010680`), `Lucas Oliveira` may map to `LUCAS APRIGIO SANTOS DE OLIVEIRA` (`20250019231`) or `LUIS FERNANDO DE ARAUJO OLIVEIRA`) or inactive/transferred students.
   - We can add non-contiguous middle-token subset matching in `scripts/reconcile_data.py` to link `João Meireles`, `João Costa`, and `Lucas Oliveira` to their SIGAA records if confirmed.
3. **Persistent Backend or Git-Backed Export Workflow**:
   - Currently, new sponsorships added via the UI (`+ Novo Apadrinhamento`) persist in `localStorage` and can be exported as a canonical JSON file (`Baixar JSON atualizado`). If multi-user persistence is desired later, we can add a Next.js API route (or Prisma + SQLite/PostgreSQL) to save directly to disk or database.
4. **Git Repository Initialization & Deployment**:
   - `/home/adiel/Projects/familiacdia` is not yet initialized with `git init`. Run `git init && git add . && git commit -m "feat: initial Familia CDIA platform"` when ready to push to GitHub and deploy to Vercel.
