---
name: cdia-tree-engine
description: >-
  Build and layout the multi-generational CDIA sponsorship Directed Acyclic Graph (DAG) using React Flow (@xyflow/react) and Dagre. Use when implementing the interactive family tree canvas, custom student nodes, Bezier sponsorship edges, or lineage highlighting.
---

# CDIA Tree and DAG Engine

Specifications for laying out and rendering the multi-generational sponsorship Directed Acyclic Graph (DAG).

## 1. Stratified Cohort Layout (`src/lib/graph-layout.ts`)

Each student can have one or more incoming sponsorship edges, forming a stratified DAG across entry cohorts.

- **Tier Assignment**: Group nodes into horizontal ranks ordered by entry cohort (`2021.2` -> `2022.1` -> `2024.1` -> `2024.2` -> `2025.1` -> `2025.2` -> `2026.1` -> `2026.2`) with `DEFAULT_RANK_SEP = 180` and `DEFAULT_NODE_SEP = 52`.
- **Crossing Minimization**: Combine `@dagrejs/dagre` (`network-simplex`) with a two-pass barycenter sweep across cohort tiers so connected godparents and godchildren align vertically.
- **Z-Index Layering & Edge Fan-Out**:
  - Nodes always render above edges (`zIndex: 20..50` on nodes, `zIndex: 1..15` on edges, enforced via `.react-flow__nodes { z-index: 10 !important }` and `.react-flow__edges { z-index: 1 !important }`).
  - Compute per-edge `sourceOffset`, `targetOffset`, and `parallelOffset` so cubic Bezier edges fan out smoothly without collinear overlap.
- **Lineage Traversal**:
  - `getAncestors(studentId, edges)`: Recursive upstream traversal of godparents.
  - `getDescendants(studentId, edges)`: Recursive downstream traversal of direct and indirect godchildren.
  - `getLineageSubgraph(studentId, nodes, edges)`: Returns the connected ego-network (`{studentId} U Ancestors U Descendants`).

## 2. High-FPS Node and Edge Rendering (`src/components/tree/`)

- **`StudentNode.tsx`**: Memoized light/dark card without GPU-heavy `backdrop-blur` layers, displaying cohort badge, student name, unified godparents summary, and godchildren/descendants count.
- **`SponsorshipEdge.tsx`**: Lightweight single-path cubic Bezier SVG (`pointer-events-none`). Unselected full-tree edges render at low opacity (`0.24`); clicking a student dims non-lineage edges (`0.04`) and highlights ancestor paths in emerald (`#10b981`) and descendant paths in sky blue (`#0ea5e9`).
- **`TreeControls.tsx`**: Compact floating toolbar pill for lineage mode (`Destacar` vs `Isolar`), layout orientation (`Vertical` vs `Horizontal`), and `Ajustar` (`fitView`).
