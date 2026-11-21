---
name: aquario-ui-design
description: >-
  Apply the visual identity, layout architecture, color palette, and component patterns of Aquario UFPB (aquarioufpb.com) to the Familia CDIA application. Use when building layouts, headers, cards, badges, drawers, or styling Tailwind CSS components.
---

# Aquario UFPB UI Design

Design tokens and layout specifications modeled after [Aquario UFPB](https://www.aquarioufpb.com/) (`github.com/aquario-ufpb/aquario`).

## 1. Visual Tokens

- **Primary Surface (Light Default)**: `bg-slate-50` (`#f8fafc`) with white cards (`bg-white border-slate-200`) and subtle sky/cyan top glow.
- **Dark Mode Surface**: `bg-slate-950` (`#020617`) with `bg-slate-900` cards and `border-slate-800`.
- **Primary Accent**: Sky/Cyan (`sky-600` in light mode, `sky-400` in dark mode) and Emerald (`emerald-500`) for active lineage paths.

## 2. Cohort Badge Palette

Use consistent semantic styling for each entry semester across tree nodes, search results, and profile drawers:
- `2021.2`: Teal (`cohort-2021-2`)
- `2022.1`: Fuchsia (`cohort-2022-1`)
- `2024.1`: Amber (`cohort-2024-1`)
- `2024.2`: Violet (`cohort-2024-2`)
- `2025.1`: Emerald (`cohort-2025-1`)
- `2025.2`: Sky (`cohort-2025-2`)
- `2026.1`: Rose (`cohort-2026-1`)
- `2026.2`: Cyan (`cohort-2026-2`)

## 3. Core Shell Components

1. **Sticky Header (`src/components/layout/Header.tsx`)**:
   - Brand title `Família CDIA` with `CI • UFPB` badge.
   - Navigation tabs: Interactive Tree, Lineage Explorer, Student Directory.
   - Global search trigger (`Cmd+K` / `Ctrl+K`), theme toggle, and `+ Novo Apadrinhamento` button.
2. **Stats Bar (`src/components/layout/StatsBar.tsx`)**:
   - Responsive metric cards and horizontally scrollable cohort filter pills.
3. **Student Profile Drawer (`src/components/student/StudentDrawer.tsx`)**:
   - Displays student name, `matricula`, entry cohort badge, unified godparents list, direct godchildren, total lineage descendants, and a button to isolate the student's lineage on the tree.
