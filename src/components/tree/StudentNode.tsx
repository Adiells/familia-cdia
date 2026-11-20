'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Crown,
  GitFork,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  getCohortTheme,
  type StudentFlowNode,
} from '../../lib/graph-layout';

function shortenPersonName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export const StudentNode = memo(function StudentNode({
  data,
  selected,
}: NodeProps<StudentFlowNode>) {
  const theme = getCohortTheme(data.cohort);
  const isHorizontal = data.direction === 'LR';
  const isSelected = Boolean(data.isSelected || selected);
  const isAncestor = Boolean(data.isAncestor);
  const isDescendant = Boolean(data.isDescendant);
  const isDimmed = Boolean(data.isDimmed);
  const isSearchMatch = Boolean(data.isSearchMatch);

  const allGodparents = [
    ...(data.p2Godparents ?? []),
    ...(data.veteranoGodparents ?? []),
  ];
  const uniqueGodparentNames = Array.from(
    new Set(allGodparents.map((g) => shortenPersonName(g.displayName)))
  );

  let containerStateClass =
    'bg-white border-slate-200/90 text-slate-900 shadow-sm hover:border-sky-500/60 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:hover:border-sky-500/50';

  if (isSelected) {
    containerStateClass =
      'bg-white border-sky-500 ring-2 ring-sky-500/60 shadow-md dark:bg-slate-900 dark:border-sky-400 dark:ring-sky-400/70';
  } else if (isSearchMatch) {
    containerStateClass =
      'bg-white border-cyan-500 ring-2 ring-cyan-500/50 shadow-md dark:bg-slate-900 dark:border-cyan-400 dark:ring-cyan-400/50';
  } else if (isAncestor) {
    containerStateClass =
      'bg-white border-emerald-500 ring-2 ring-emerald-500/40 shadow-md dark:bg-slate-900 dark:border-emerald-400 dark:ring-emerald-400/45';
  } else if (isDescendant) {
    containerStateClass =
      'bg-white border-sky-500 ring-2 ring-sky-500/40 shadow-md dark:bg-slate-900 dark:border-sky-400 dark:ring-sky-400/45';
  }

  const opacityClass = isDimmed ? 'opacity-15' : 'opacity-100';

  const depthLabel =
    typeof data.lineageDepth === 'number' && data.lineageDepth !== 0
      ? data.lineageDepth === -1
        ? 'Padrinho/Madrinha'
        : data.lineageDepth < -1
          ? `Ancestral (${Math.abs(data.lineageDepth)}ª ger.)`
          : data.lineageDepth === 1
            ? 'Afilhado(a) Direto'
            : `Descendente (${data.lineageDepth}ª ger.)`
      : null;

  return (
    <div
      data-testid={`student-node-${data.id}`}
      data-cohort={data.cohort}
      data-lineage-relation={data.lineageRelation}
      className={`group relative w-[252px] min-h-[126px] rounded-xl border px-3.5 py-2.5 text-left transition-colors select-none cursor-pointer ${containerStateClass} ${opacityClass}`}
    >
      {/* Top accent bar colored by generation cohort */}
      <div
        className="absolute inset-x-3 top-0 h-[2px] rounded-full opacity-80"
        style={{ backgroundColor: theme.accentColor }}
      />

      {/* Target Handle (Incoming Sponsorship from Godparents) */}
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-white !bg-sky-500 dark:!border-slate-950 dark:!bg-sky-400"
      />

      {/* Header Row: Cohort Badge + Lineage Relation Pill */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${theme.badgeClass}`}
          title={`${theme.generationTitle} (${data.cohort})`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
          {data.cohort}
        </span>

        {isSelected && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-500/15 border border-sky-500/40 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-300">
            <Sparkles className="h-2.5 w-2.5" />
            Foco
          </span>
        )}

        {!isSelected && depthLabel && (
          <span
            className={`truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${
              isAncestor
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                : 'bg-sky-500/15 border-sky-500/35 text-sky-700 dark:text-sky-300'
            }`}
          >
            {depthLabel}
          </span>
        )}
      </div>

      {/* Student Display Name & Full Canonical Name */}
      <div className="mb-2">
        <h3
          className="text-xs font-bold leading-snug text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-300 transition-colors line-clamp-1"
          title={data.canonicalName}
        >
          {data.displayName}
        </h3>
        <p
          className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5"
          title={data.canonicalName}
        >
          {data.canonicalName}
        </p>
      </div>

      {/* Unified Godparents Indicator */}
      <div className="mb-2">
        {uniqueGodparentNames.length > 0 ? (
          <div
            className="inline-flex items-center gap-1.5 max-w-full truncate rounded-md bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 text-[9px] font-medium text-sky-700 dark:text-sky-300"
            title={`Padrinhos: ${allGodparents.map((g) => g.displayName).join(', ')}`}
          >
            <UserCheck className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">
              {uniqueGodparentNames.join(' • ')}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 text-[9px] text-amber-700 dark:text-amber-300/80">
            <Crown className="h-2.5 w-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Raiz de Linhagem</span>
          </div>
        )}
      </div>

      {/* Footer Row: Unified Padrinhos Count & Afilhados Count */}
      <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800/80 pt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center gap-1"
            title={`${data.godparentsCount} padrinho(s) registrado(s)`}
          >
            <UserCheck className="h-3 w-3 text-sky-600/80 dark:text-sky-400/80" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {data.godparentsCount}
            </span>
            <span>
              {data.godparentsCount === 1 ? 'padrinho' : 'padrinhos'}
            </span>
          </div>

          <div
            className="inline-flex items-center gap-1"
            title={`${data.godchildrenCount} afilhado(s) direto(s)`}
          >
            <Users className="h-3 w-3 text-sky-600/80 dark:text-sky-400/80" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {data.godchildrenCount}
            </span>
            <span>
              {data.godchildrenCount === 1 ? 'afilhado' : 'afilhados'}
            </span>
          </div>
        </div>

        {data.descendantsCount > data.godchildrenCount && (
          <div
            className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-cyan-700 dark:text-cyan-300/90"
            title={`Total de ${data.descendantsCount} descendentes na linhagem acadêmica`}
          >
            <GitFork className="h-2.5 w-2.5 text-cyan-600 dark:text-cyan-400" />
            <span>+{data.descendantsCount}</span>
          </div>
        )}
      </div>

      {/* Source Handle (Outgoing Sponsorship to Godchildren) */}
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-white !bg-cyan-500 dark:!border-slate-950 dark:!bg-cyan-400"
      />
    </div>
  );
});

export default StudentNode;
