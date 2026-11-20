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
    'bg-slate-900/85 border-slate-800/85 hover:border-sky-500/50 shadow-lg shadow-slate-950/60';

  if (isSelected) {
    containerStateClass =
      'bg-slate-900/95 border-sky-400 ring-2 ring-sky-400/70 shadow-[0_0_28px_-4px_rgba(56,189,248,0.55)] scale-[1.02]';
  } else if (isSearchMatch) {
    containerStateClass =
      'bg-slate-900/95 border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_22px_-4px_rgba(34,211,238,0.45)]';
  } else if (isAncestor) {
    containerStateClass =
      'bg-slate-900/92 border-sky-400/75 ring-1 ring-sky-400/35 shadow-[0_0_20px_-5px_rgba(56,189,248,0.35)]';
  } else if (isDescendant) {
    containerStateClass =
      'bg-slate-900/92 border-cyan-400/75 ring-1 ring-cyan-400/35 shadow-[0_0_20px_-5px_rgba(34,211,238,0.35)]';
  }

  const opacityClass = isDimmed
    ? 'opacity-20 saturate-50 hover:opacity-60'
    : 'opacity-100';

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
      className={`group relative w-[252px] min-h-[126px] rounded-xl border backdrop-blur-md px-3.5 py-2.5 text-left transition-all duration-200 select-none cursor-pointer ${containerStateClass} ${opacityClass}`}
    >
      {/* Top accent bar colored by generation cohort */}
      <div
        className="absolute inset-x-3 top-0 h-[2px] rounded-full opacity-75 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: theme.accentColor }}
      />

      {/* Target Handle (Incoming Sponsorship from Godparents) */}
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-slate-950 !bg-sky-400 transition-transform group-hover:scale-125"
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
          <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300">
            <Sparkles className="h-2.5 w-2.5" />
            Foco
          </span>
        )}

        {!isSelected && depthLabel && (
          <span className="truncate rounded-md border bg-sky-500/15 border-sky-400/35 px-1.5 py-0.5 text-[9px] font-medium text-sky-300">
            {depthLabel}
          </span>
        )}
      </div>

      {/* Student Display Name & Full Canonical Name */}
      <div className="mb-2">
        <h3
          className="text-xs font-bold leading-snug text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-1"
          title={data.canonicalName}
        >
          {data.displayName}
        </h3>
        <p
          className="text-[10px] text-slate-400 truncate leading-tight mt-0.5"
          title={data.canonicalName}
        >
          {data.canonicalName}
        </p>
      </div>

      {/* Unified Godparents Indicator */}
      <div className="mb-2">
        {uniqueGodparentNames.length > 0 ? (
          <div
            className="inline-flex items-center gap-1.5 max-w-full truncate rounded-md bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 text-[9px] font-medium text-sky-300"
            title={`Padrinhos: ${allGodparents.map((g) => g.displayName).join(', ')}`}
          >
            <UserCheck className="h-2.5 w-2.5 text-sky-400 shrink-0" />
            <span className="truncate">
              {uniqueGodparentNames.join(' • ')}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 text-[9px] text-amber-300/80">
            <Crown className="h-2.5 w-2.5 text-amber-400 shrink-0" />
            <span>Raiz de Linhagem</span>
          </div>
        )}
      </div>

      {/* Footer Row: Unified Padrinhos Count & Afilhados Count */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center gap-1"
            title={`${data.godparentsCount} padrinho(s) registrado(s)`}
          >
            <UserCheck className="h-3 w-3 text-sky-400/80" />
            <span className="font-medium text-slate-300">
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
            <Users className="h-3 w-3 text-sky-400/80" />
            <span className="font-medium text-slate-300">
              {data.godchildrenCount}
            </span>
            <span>
              {data.godchildrenCount === 1 ? 'afilhado' : 'afilhados'}
            </span>
          </div>
        </div>

        {data.descendantsCount > data.godchildrenCount && (
          <div
            className="inline-flex items-center gap-0.5 text-[9px] font-medium text-cyan-300/90"
            title={`Total de ${data.descendantsCount} descendentes na linhagem acadêmica`}
          >
            <GitFork className="h-2.5 w-2.5 text-cyan-400" />
            <span>+{data.descendantsCount}</span>
          </div>
        )}
      </div>

      {/* Source Handle (Outgoing Sponsorship to Godchildren) */}
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-slate-950 !bg-cyan-400 transition-transform group-hover:scale-125"
      />
    </div>
  );
});

export default StudentNode;
