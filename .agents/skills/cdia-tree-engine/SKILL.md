---
name: cdia-tree-engine
description: >-
  Build and layout the multi-generational CDIA sponsorship Directed Acyclic Graph (DAG) using React Flow (@xyflow/react) and Dagre. Use when implementing the interactive family tree canvas, custom student nodes, P2 vs Veterano edges, or lineage highlighting.
---

# CDIA Tree and DAG Engine

Specifications for laying out and rendering the multi-generational sponsorship Directed Acyclic Graph (DAG).

## 1. Stratified Cohort Layout (`src/lib/graph-layout.ts`)

Each student can have two incoming sponsorship edges (`role: "P2"` and `role: "VETERANO"`), forming a DAG rather than a single-parent tree.

- **Tier Assignment**: Group nodes into horizontal ranks ordered by entry cohort (`2024.1` -> `2024.2` -> `2025.1` -> `2025.2` -> `2026.1`).
- **Crossing Minimization**: Run `@dagrejs/dagre` or barycenter ordering within each cohort tier so connected godparents and godchildren align vertically.
- **Lineage Traversal**:
  - `getAncestors(studentId, edges)`: Recursive upstream traversal of P2 and Veterano godparents.
  - `getDescendants(studentId, edges)`: Recursive downstream traversal of direct and indirect godchildren.
  - `getLineageSubgraph(studentId, nodes, edges)`: Returns the connected ego-network (`{studentId} U Ancestors U Descendants`).

## 2. Node and Edge Rendering (`src/components/tree/`)

- **`StudentNode.tsx`**: Compact card displaying initials/avatar, `displayName`, cohort badge, SIGAA verified indicator, incoming godparent badges, and outgoing godchildren counter.
- **`SponsorshipEdge.tsx`**:
  - `role === 'P2'`: Solid `#38bdf8` (`sky-400`) path, 2px width.
  - `role === 'VETERANO'`: Dashed `#a78bfa` (`violet-400`) path (`strokeDasharray: '6 4'`), 1.75px width.
- **`TreeControls.tsx`**: Controls to filter edge roles (`ALL`, `P2`, `VETERANO`), filter cohorts, toggle layout direction (`TB` vs `LR`), and toggle between dimming non-lineage nodes (`Highlight Mode`) or hiding them (`Isolate Mode`).
