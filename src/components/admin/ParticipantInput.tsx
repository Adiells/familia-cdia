'use client';

import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { SigaaStudentRecord } from '../../data/types';
import { normalizeSearchText } from '../../lib/search';
import {
  getExternalCohortError,
  getExternalNameError,
  normalizeCohortInput,
  type ParticipantDraft,
} from './batch-parser';

export interface ParticipantInputProps {
  label: string;
  value: ParticipantDraft;
  onChange: (next: ParticipantDraft) => void;
  sigaaStudents: SigaaStudentRecord[];
  placeholder?: string;
  onRemove?: () => void;
  removeLabel?: string;
}

export function ParticipantInput({
  label,
  value,
  onChange,
  sigaaStudents,
  placeholder = 'Busque no SIGAA por nome ou matrícula...',
  onRemove,
  removeLabel,
}: ParticipantInputProps) {
  const suggestions = useMemo(() => {
    if (value.mode !== 'sigaa' || !value.query.trim() || value.picked) return [];
    const normalizedQuery = normalizeSearchText(value.query);
    if (!normalizedQuery) return [];
    return sigaaStudents
      .filter((record) => normalizeSearchText(`${record.name} ${record.matricula}`).includes(normalizedQuery))
      .slice(0, 8);
  }, [value.mode, value.query, value.picked, sigaaStudents]);

  const nameError = value.mode === 'external' && value.name.trim() ? getExternalNameError(value.name) : null;
  const cohortError = value.mode === 'external' && value.cohort.trim() ? getExternalCohortError(value.cohort) : null;
  const normalizedCohort = value.mode === 'external' ? normalizeCohortInput(value.cohort) : null;
  const externalValid = value.mode === 'external' && !getExternalNameError(value.name) && Boolean(normalizedCohort);

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <div
            role="group"
            aria-label={`Origem de ${label}`}
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800/80"
          >
            <button
              type="button"
              onClick={() => onChange({ ...value, mode: 'sigaa' })}
              className={`min-h-8 rounded-md px-2.5 py-1 font-medium transition ${
                value.mode === 'sigaa'
                  ? 'bg-white text-sky-700 shadow-xs dark:bg-slate-900 dark:text-sky-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              SIGAA ativo
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, mode: 'external' })}
              className={`min-h-8 rounded-md px-2.5 py-1 font-medium transition ${
                value.mode === 'external'
                  ? 'bg-white text-sky-700 shadow-xs dark:bg-slate-900 dark:text-sky-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Formado / fora do SIGAA
            </button>
          </div>
        </div>

        {value.mode === 'sigaa' ? (
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                aria-label={label}
                value={value.query}
                onChange={(event) => onChange({ ...value, query: event.target.value, picked: null })}
                placeholder={placeholder}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 sm:text-sm"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {suggestions.map((record) => (
                    <button
                      key={record.matricula}
                      type="button"
                      onClick={() => onChange({ ...value, query: record.name, picked: record })}
                      className="block min-h-14 w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <span className="block text-sm text-slate-900 dark:text-slate-100">{record.name}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{record.matricula}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {value.picked && (
              <span className="mt-1.5 block text-xs text-emerald-700 dark:text-emerald-300">
                SIGAA: {value.picked.matricula}
              </span>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_11rem]">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Nome completo
              <input
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder="Ex.: Maria Clara Silva"
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 sm:text-sm"
              />
              {nameError && (
                <span className="mt-1 block text-xs font-normal text-rose-600 dark:text-rose-400">{nameError}</span>
              )}
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Ano/Período de ingresso
              <input
                value={value.cohort}
                onChange={(event) => onChange({ ...value, cohort: event.target.value })}
                placeholder="Ex.: 2020.1"
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 sm:text-sm"
              />
              {cohortError && (
                <span className="mt-1 block text-xs font-normal text-rose-600 dark:text-rose-400">{cohortError}</span>
              )}
            </label>
            {externalValid && (
              <span className="text-xs text-emerald-700 dark:text-emerald-300 sm:col-span-2">
                Fora do SIGAA · Ingresso {normalizedCohort}
              </span>
            )}
          </div>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel ?? `Remover ${label}`}
          onClick={onRemove}
          className="mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
