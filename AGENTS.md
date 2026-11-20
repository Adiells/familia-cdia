# Familia CDIA - Project Guidelines

Academic genealogy and sponsorship tree platform for the Data Science and Artificial Intelligence (CDIA) degree at UFPB (Centro de Informatica).

## Architecture and Stack

- **Framework**: Next.js (App Router), TypeScript (`strict: true`), React.
- **Styling**: Tailwind CSS, `lucide-react`, `clsx`, `tailwind-merge`. Visual language modeled after [Aquario UFPB](https://github.com/aquario-ufpb/aquario).
- **Graph Engine**: `@xyflow/react` and `@dagrejs/dagre` for stratified Directed Acyclic Graph (DAG) rendering across cohorts (`2024.1`, `2024.2`, `2025.1`, `2025.2`, `2026.1`).
- **Data Pipeline**: Python scripts in `scripts/` reconcile raw PDF sponsorship pairings against official active student records from SIGAA UFPB (`id=14289031`).

## Repository Layout

- `AGENTS.md` / `GEMINI.md`: Workspace rules and multi-agent ownership boundaries.
- `.agents/skills/`: Domain-specific procedural skills (`sigaa-entity-resolution`, `aquario-ui-design`, `cdia-tree-engine`).
- `scripts/`: Data scraping (`scrape_sigaa.py`), entity resolution (`reconcile_data.py`), and graph validation (`validate_graph.mjs`).
- `src/data/`: Shared TypeScript interfaces (`types.ts`), raw PDF transcriptions (`raw-pdf-sponsorships.json`), and canonical JSON outputs (`sigaa-students.json`, `students.json`, `sponsorships.json`, `reconciliation-audit.json`).
- `src/lib/`: Graph layout and lineage traversal (`graph-layout.ts`), fuzzy accent-insensitive search (`search.ts`).
- `src/components/layout/`: Aquario-style header, stats bar, and theme shell.
- `src/components/tree/`: React Flow canvas, custom student nodes, P2/Veterano edges, and filter controls.
- `src/components/student/`: Student profile drawer showing lineage, godparents, godchildren, and SIGAA status.
- `src/components/search/`: Command palette (`Cmd+K` / `Ctrl+K`) search modal.
- `src/components/admin/`: Sponsorship ingestion modal with SIGAA autocomplete and reconciliation audit table.

## Shared Data Contract

All components and scripts must conform to the types exported in `src/data/types.ts`:
- `StudentNodeData`: Canonical student entity (`id`, `canonicalName`, `displayName`, `matricula`, `cohort`, `aliases`, `sigaaVerified`, `matchConfidence`).
- `SponsorshipEdgeData`: Directed sponsorship edge (`id`, `godparentId`, `godchildId`, `role`: `'P2' | 'VETERANO'`, `semester`, `sourceDoc`).
- `ReconciliationAuditEntry`: Audit record mapping raw PDF names to canonical student IDs.

## Maestri Multi-Agent Ownership Rules

1. Run `maestri list` before delegating or reading shared resources (`familia-cdia-spec`, `SIGAA Portal`).
2. Respect file ownership boundaries to prevent merge and write conflicts:
   - **Khipu** (`Codex` - Data & SIGAA Engineer): `scripts/*` and `src/data/*.json`.
   - **Coral** (`Antigravity` - Aquario UI Architect): Project config, `src/app/*`, `src/components/layout/*`, `src/components/student/*`.
   - **Yggdrasil** (`Antigravity` - Tree & Graph Specialist): `src/lib/graph-layout.ts`, `src/components/tree/*`.
   - **Aegis** (`Codex` - Search Admin & QA Engineer): `src/lib/search.ts`, `src/components/search/*`, `src/components/admin/*`.
3. Report task completion back to the orchestrator with `maestri ask "Antigravity" "<concise summary>"`.
