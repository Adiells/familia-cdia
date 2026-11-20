---
name: aquario-ui-design
description: >-
  Apply the visual identity, layout architecture, color palette, and component patterns of Aquario UFPB (aquarioufpb.com) to the Familia CDIA application. Use when building layouts, headers, cards, badges, drawers, or styling Tailwind CSS components.
---

# Aquario UFPB UI Design

Design tokens and layout specifications modeled after [Aquario UFPB](https://www.aquarioufpb.com/) (`github.com/aquario-ufpb/aquario`).

## 1. Visual Tokens

- **Primary Surface (Dark Default)**: `bg-slate-950` (`#020617`) with subtle top radial highlight (`from-sky-500/10 via-cyan-500/5 to-transparent`).
- **Cards and Panels**: `bg-slate-900/75 backdrop-blur-md border border-slate-800/80 hover:border-sky-500/40 transition-colors`.
- **Primary Accent**: Sky/Cyan (`sky-400`, `cyan-400`, `blue-500`) used for active states and `P2` sponsorship links.
- **Secondary Accent**: Violet/Amber (`violet-400`, `amber-400`) used for `VETERANO` sponsorship links and founding cohorts.

## 2. Cohort Badge Palette

Use consistent semantic styling for each entry semester across tree nodes, search results, and profile drawers:
- `2024.1`: `bg-amber-500/15 text-amber-300 border-amber-500/30`
- `2024.2`: `bg-violet-500/15 text-violet-300 border-violet-500/30`
- `2025.1`: `bg-emerald-500/15 text-emerald-300 border-emerald-500/30`
- `2025.2`: `bg-sky-500/15 text-sky-300 border-sky-500/30`
- `2026.1`: `bg-rose-500/15 text-rose-300 border-rose-500/30`

## 3. Core Shell Components

1. **Sticky Header (`src/components/layout/Header.tsx`)**:
   - Brand title `Família CDIA` with `CI • UFPB` badge.
   - Navigation tabs: Interactive Tree, Lineage Explorer, SIGAA Directory & Audit.
   - Global search trigger (`Cmd+K` / `Ctrl+K`) and `+ Novo Apadrinhamento` action button.
2. **Stats Bar (`src/components/layout/StatsBar.tsx`)**:
   - Displays total students, SIGAA verification rate, total P2 and Veterano links, and active cohorts.
3. **Student Profile Drawer (`src/components/student/StudentDrawer.tsx`)**:
   - Displays canonical SIGAA name, `matricula`, verification badge, entry cohort, P2 godparent, Veterano godparent, direct godchildren, total lineage descendants, unified PDF aliases, and a button to isolate the student's lineage on the tree.
