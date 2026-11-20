# Familia CDIA - Project Guidelines

Academic genealogy and sponsorship tree platform for the Data Science and Artificial Intelligence (CDIA) degree at UFPB (Centro de Informatica).

## Architecture and Stack

- **Frontend**: Next.js (App Router, static export support for GitHub Pages), TypeScript (`strict: true`), React.
- **Styling**: Tailwind CSS v4, `lucide-react`, `clsx`, `tailwind-merge`, with light mode default and dark mode support.
- **Graph Engine**: `@xyflow/react` and `@dagrejs/dagre` for cohort-layered Directed Acyclic Graph (DAG) rendering with cubic Bezier edge fan-out.
- **Backend API**: Zero-dependency Node.js HTTP service in `backend/server.mjs` containerized via `backend/Dockerfile` for Google Cloud Run (`GET /health`, `GET /api/sponsorships`, `POST /api/sponsorships`).
- **Data Pipeline**: Python scripts in `scripts/` reconcile sponsorship records against official active student records from SIGAA UFPB (`id=14289031`).

## Repository Layout

- `AGENTS.md` / `GEMINI.md`: Repository architecture, coding conventions, and data contracts.
- `.agents/skills/`: Domain skills (`sigaa-entity-resolution`, `aquario-ui-design`, `cdia-tree-engine`).
- `backend/`: Standalone Google Cloud Run API service (`server.mjs`, `Dockerfile`, `package.json`).
- `scripts/`: SIGAA data parser (`scrape_sigaa.py`), entity resolution (`reconcile_data.py`), graph validator (`validate_graph.mjs`), and GitHub Pages build helper (`build-pages.mjs`).
- `src/data/`: Shared TypeScript interfaces (`types.ts`), raw sponsorship inputs (`raw-pdf-sponsorships.json`), and canonical JSON datasets (`sigaa-students.json`, `students.json`, `sponsorships.json`, `reconciliation-audit.json`).
- `src/lib/`: Stratified DAG layout and lineage traversal (`graph-layout.ts`), accent-insensitive fuzzy search (`search.ts`), and API client configuration (`api.ts`).
- `src/components/layout/`: Header, stats bar, and theme toggle.
- `src/components/tree/`: React Flow canvas, student node cards, Bezier sponsorship edges, and toolbar controls.
- `src/components/student/`: Student profile drawer and semantic cohort badges.
- `src/components/search/`: Command palette (`Cmd+K` / `Ctrl+K`) search modal.
- `src/components/admin/`: Sponsorship ingestion modal supporting `1+` godparents via SIGAA autocomplete or CSV/JSON batch import.

## Shared Data Contract

All components, scripts, and API endpoints must conform to `src/data/types.ts`:
- `StudentNodeData`: Canonical student entity (`id`, `canonicalName`, `displayName`, `matricula`, `cohort`, `aliases`, `sigaaVerified`, `matchConfidence`).
- `SponsorshipEdgeData`: Directed sponsorship edge (`id`, `godparentId`, `godchildId`, `role`, `semester`, `sourceDoc`).

## Verification Commands

- `npm run typecheck`: Run TypeScript compiler validation.
- `npm run lint`: Run ESLint across `src/`.
- `node scripts/validate_graph.mjs`: Validate zero duplicate student IDs, 100% edge referential integrity, and DAG acyclicity.
- `npm run build`: Build static frontend bundle.
- `npm run build:pages`: Build GitHub Pages static export into `out/`.
