'use client';

import React from 'react';
import {
  ArrowDownUp,
  ArrowLeftRight,
  Eye,
  Filter,
  Focus,
  Layers,
  Maximize2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { CohortSemester, StudentNodeData } from '../../data/types';
import {
  COHORT_ORDER,
  getCohortTheme,
  type LayoutDirection,
  type LineageMode,
  type RoleFilter,
} from '../../lib/graph-layout';

export interface TreeControlsProps {
  roleFilter?: RoleFilter;
  onRoleFilterChange?: (role: RoleFilter) => void;
  cohortFilter: CohortSemester | 'ALL';
  onCohortFilterChange: (cohort: CohortSemester | 'ALL') => void;
  direction: LayoutDirection;
  onDirectionChange: (direction: LayoutDirection) => void;
  lineageMode: LineageMode;
  onLineageModeChange: (mode: LineageMode) => void;
  selectedStudent?: StudentNodeData | null;
  ancestorsCount?: number;
  descendantsCount?: number;
  onClearSelection?: () => void;
  onFitView?: () => void;
  onCenterSelected?: () => void;
  generationCounts?: Record<string, number>;
  visibleStudentsCount?: number;
  visibleEdgesCount?: number;
  totalStudentsCount?: number;
  className?: string;
}

export function TreeControls({
  onRoleFilterChange,
  cohortFilter,
  onCohortFilterChange,
  direction,
  onDirectionChange,
  lineageMode,
  onLineageModeChange,
  selectedStudent = null,
  ancestorsCount = 0,
  descendantsCount = 0,
  onClearSelection,
  onFitView,
  onCenterSelected,
  generationCounts = {},
  visibleStudentsCount = 0,
  visibleEdgesCount = 0,
  totalStudentsCount = 0,
  className = '',
}: TreeControlsProps) {
  const hasActiveFilter =
    cohortFilter !== 'ALL' ||
    Boolean(selectedStudent) ||
    lineageMode === 'ISOLATE';

  const handleResetAll = () => {
    onRoleFilterChange?.('ALL');
    onCohortFilterChange('ALL');
    onLineageModeChange('HIGHLIGHT');
    onClearSelection?.();
  };

  return (
    <div
      data-testid="tree-controls"
      className={`pointer-events-auto flex flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-3 text-slate-700 shadow-lg dark:border-slate-800/85 dark:bg-slate-950/90 dark:text-slate-200 dark:shadow-2xl ${className}`}
    >
      {/* Top Row: Cohort Semester Filter Pills + Lineage Mode Toggle + Orientation Toggle + Fit View */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Cohort Filter Chips ('ALL' | '2024.1' .. '2026.1') */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 mr-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Layers className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" />
            Geração:
          </span>

          <button
            type="button"
            data-testid="cohort-filter-all"
            onClick={() => onCohortFilterChange('ALL')}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
              cohortFilter === 'ALL'
                ? 'bg-sky-500/15 text-sky-800 border-sky-500/40 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-sky-400/50'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800 dark:hover:text-slate-200 dark:hover:border-slate-700'
            }`}
          >
            <span>Todas</span>
            {totalStudentsCount > 0 && (
              <span className="rounded bg-white/80 px-1 text-[10px] text-slate-600 dark:bg-slate-950/70 dark:text-slate-400">
                {totalStudentsCount}
              </span>
            )}
          </button>

          {COHORT_ORDER.map((cohort) => {
            const theme = getCohortTheme(cohort);
            const isActive = cohortFilter === cohort;
            const count = generationCounts[cohort];

            return (
              <button
                key={cohort}
                type="button"
                data-testid={`cohort-filter-${cohort}`}
                onClick={() =>
                  onCohortFilterChange(isActive ? 'ALL' : cohort)
                }
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? `${theme.badgeClass} ring-1 ring-current shadow-sm`
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800 dark:hover:text-slate-200 dark:hover:border-slate-700'
                }`}
                title={`Filtrar geração ${cohort} (${theme.generationTitle})`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
                <span>{cohort}</span>
                {typeof count === 'number' && (
                  <span className="rounded bg-white/80 px-1 text-[10px] text-slate-600 opacity-90 dark:bg-slate-950/60 dark:text-slate-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Controls: Lineage Mode + Orientation ('TB' | 'LR') + Fit View */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Lineage Isolation Mode Toggle: 'Destacar Linhagem' vs 'Isolar Sub-árvore' */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800/90 dark:bg-slate-900/80">
            <button
              type="button"
              data-testid="lineage-mode-highlight"
              onClick={() => onLineageModeChange('HIGHLIGHT')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                lineageMode === 'HIGHLIGHT'
                  ? 'bg-white text-sky-700 border border-sky-500/40 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
              title="Destaca a linhagem do aluno selecionado mantendo o restante da árvore visível em segundo plano"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Destacar Linhagem</span>
            </button>

            <button
              type="button"
              data-testid="lineage-mode-isolate"
              onClick={() => onLineageModeChange('ISOLATE')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                lineageMode === 'ISOLATE'
                  ? 'bg-white text-amber-700 border border-amber-500/40 shadow-sm dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
              title="Oculta nós fora da linhagem e reorganiza apenas a sub-árvore de ancestrais e descendentes"
            >
              <Focus className="h-3.5 w-3.5" />
              <span>Isolar Sub-árvore</span>
            </button>
          </div>

          {/* Layout Orientation ('TB' | 'LR') */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800/90 dark:bg-slate-900/80">
            <button
              type="button"
              data-testid="layout-direction-tb"
              onClick={() => onDirectionChange('TB')}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                direction === 'TB'
                  ? 'bg-white text-sky-700 border border-sky-500/40 shadow-sm dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
              title="Layout Vertical por Geração (Topo -> Base)"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vertical</span>
            </button>

            <button
              type="button"
              data-testid="layout-direction-lr"
              onClick={() => onDirectionChange('LR')}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                direction === 'LR'
                  ? 'bg-white text-sky-700 border border-sky-500/40 shadow-sm dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
              title="Layout Horizontal por Geração (Esquerda -> Direita)"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Horizontal</span>
            </button>
          </div>

          {onFitView && (
            <button
              type="button"
              data-testid="tree-fit-view"
              onClick={onFitView}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-500/50 hover:text-sky-700 dark:border-slate-800/90 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:text-sky-300 transition-colors"
              title="Centralizar e ajustar zoom para exibir toda a árvore"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Ajustar</span>
            </button>
          )}

          {hasActiveFilter && (
            <button
              type="button"
              data-testid="tree-reset-filters"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 transition-colors"
              title="Limpar todos os filtros e seleção de linhagem"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resetar</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Active Selected Student Lineage Pill or Summary */}
      {(selectedStudent || visibleStudentsCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 dark:border-slate-800/70 pt-1.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Filter className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            <span>
              Exibindo{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {visibleStudentsCount}
              </strong>{' '}
              alunos e{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {visibleEdgesCount}
              </strong>{' '}
              vínculos
            </span>
          </div>

          {selectedStudent && (
            <div className="flex items-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-800 dark:text-sky-200">
              <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <button
                type="button"
                onClick={onCenterSelected}
                className="font-semibold hover:underline truncate max-w-[180px]"
                title="Clique para centralizar no estudante selecionado"
              >
                {selectedStudent.displayName}
              </button>
              <span className="hidden sm:inline text-[11px] text-sky-700/80 dark:text-sky-300/80">
                ({ancestorsCount} {ancestorsCount === 1 ? 'ancestral' : 'ancestrais'} •{' '}
                {descendantsCount}{' '}
                {descendantsCount === 1 ? 'descendente' : 'descendentes'})
              </span>
              {onClearSelection && (
                <button
                  type="button"
                  data-testid="clear-lineage-selection"
                  onClick={onClearSelection}
                  className="ml-1 rounded-md p-0.5 text-sky-700 hover:bg-sky-500/20 hover:text-sky-900 dark:text-sky-300 dark:hover:text-white transition-colors"
                  title="Limpar foco de linhagem"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TreeControls;
