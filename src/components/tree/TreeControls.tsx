'use client';

import React from 'react';
import {
  ArrowDownUp,
  ArrowLeftRight,
  Eye,
  Focus,
  Maximize2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { CohortSemester, StudentNodeData } from '../../data/types';
import type {
  LayoutDirection,
  LineageMode,
} from '../../lib/graph-layout';

export interface TreeControlsProps {
  cohortFilter?: CohortSemester | 'ALL';
  onCohortFilterChange?: (cohort: CohortSemester | 'ALL') => void;
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
  className?: string;
}

export function TreeControls({
  cohortFilter = 'ALL',
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
  className = '',
}: TreeControlsProps) {
  const hasActiveFilter =
    cohortFilter !== 'ALL' ||
    Boolean(selectedStudent) ||
    lineageMode === 'ISOLATE';

  const handleResetAll = () => {
    onCohortFilterChange?.('ALL');
    onLineageModeChange('HIGHLIGHT');
    onClearSelection?.();
  };

  return (
    <div
      data-testid="tree-controls"
      className={`pointer-events-auto inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-slate-700 shadow-md dark:border-slate-800/85 dark:bg-slate-950/90 dark:text-slate-200 dark:shadow-xl ${className}`}
    >
      {/* Lineage Mode Toggle: 'Destacar' | 'Isolar' */}
      <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 dark:border-slate-800/90 dark:bg-slate-900/80">
        <button
          type="button"
          data-testid="lineage-mode-highlight"
          onClick={() => onLineageModeChange('HIGHLIGHT')}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            lineageMode === 'HIGHLIGHT'
              ? 'bg-white text-sky-700 border border-sky-500/40 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400/40'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
          }`}
          title="Destaca a linhagem do aluno selecionado mantendo o restante da árvore visível em segundo plano"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>Destacar</span>
        </button>

        <button
          type="button"
          data-testid="lineage-mode-isolate"
          onClick={() => onLineageModeChange('ISOLATE')}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            lineageMode === 'ISOLATE'
              ? 'bg-white text-amber-700 border border-amber-500/40 shadow-sm dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/40'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
          }`}
          title="Oculta nós fora da linhagem e reorganiza apenas a sub-árvore de ancestrais e descendentes"
        >
          <Focus className="h-3.5 w-3.5 shrink-0" />
          <span>Isolar</span>
        </button>
      </div>

      {/* Layout Orientation ('TB' Vertical | 'LR' Horizontal) */}
      <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 dark:border-slate-800/90 dark:bg-slate-900/80">
        <button
          type="button"
          data-testid="layout-direction-tb"
          onClick={() => onDirectionChange('TB')}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            direction === 'TB'
              ? 'bg-white text-sky-700 border border-sky-500/40 shadow-sm dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/40'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
          }`}
          title="Layout Vertical por Geração (Topo -> Base)"
        >
          <ArrowDownUp className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Vertical</span>
        </button>

        <button
          type="button"
          data-testid="layout-direction-lr"
          onClick={() => onDirectionChange('LR')}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            direction === 'LR'
              ? 'bg-white text-sky-700 border border-sky-500/40 shadow-sm dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/40'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 border border-transparent'
          }`}
          title="Layout Horizontal por Geração (Esquerda -> Direita)"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Horizontal</span>
        </button>
      </div>

      {/* Fit View Button */}
      {onFitView && (
        <button
          type="button"
          data-testid="tree-fit-view"
          onClick={onFitView}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-500/50 hover:text-sky-700 dark:border-slate-800/90 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:text-sky-300 transition-colors"
          title="Centralizar e ajustar zoom para exibir toda a árvore"
        >
          <Maximize2 className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Ajustar</span>
        </button>
      )}

      {/* Reset Button (only when a filter or student selection is active) */}
      {hasActiveFilter && (
        <button
          type="button"
          data-testid="tree-reset-filters"
          onClick={handleResetAll}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 transition-colors"
          title="Limpar todos os filtros e seleção de linhagem"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Resetar</span>
        </button>
      )}

      {/* Selected Student Compact Pill */}
      {selectedStudent && (
        <div className="inline-flex items-center gap-1 rounded-lg border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-800 dark:text-sky-200">
          <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
          <button
            type="button"
            onClick={onCenterSelected}
            className="font-semibold hover:underline truncate max-w-[130px] sm:max-w-[180px]"
            title="Clique para centralizar no estudante selecionado"
          >
            {selectedStudent.displayName}
          </button>
          <span className="hidden md:inline text-[10px] text-sky-700/80 dark:text-sky-300/80">
            ({ancestorsCount}↑ • {descendantsCount}↓)
          </span>
          {onClearSelection && (
            <button
              type="button"
              data-testid="clear-lineage-selection"
              onClick={onClearSelection}
              className="ml-0.5 rounded p-0.5 text-sky-700 hover:bg-sky-500/20 hover:text-sky-900 dark:text-sky-300 dark:hover:text-white transition-colors"
              title="Limpar foco de linhagem"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TreeControls;
