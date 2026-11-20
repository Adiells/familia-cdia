'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { StudentNodeData } from '../../data/types';
import canonicalStudents from '../../data/students.json';

const defaultStudents = canonicalStudents as unknown as StudentNodeData[];
import { searchStudents } from '../../lib/search';

export interface CommandSearchProps {
  students?: StudentNodeData[];
  onSelectStudent: (student: StudentNodeData) => void;
  /** Optional external trigger state. Without it, Cmd/Ctrl+K and the trigger button control the modal. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandSearch({ students = defaultStudents, onSelectStudent, open: controlledOpen, onOpenChange }: CommandSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpen = controlledOpen ?? internalOpen;
  const results = useMemo(() => searchStudents(students, query, 30), [students, query]);

  const setOpen = useCallback((next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!isOpen);
      } else if (isOpen && event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => setActiveIndex(0), [query]);

  const choose = (student: StudentNodeData) => {
    onSelectStudent(student);
    setOpen(false);
  };

  const showTrigger = controlledOpen === undefined;

  return (
    <>
      {showTrigger && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Buscar estudantes" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-700 transition hover:border-sky-500/50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-sky-200">
          <Search className="h-4 w-4" /> Buscar
          <kbd className="hidden rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:inline">⌘K</kbd>
        </button>
      )}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 px-0 pt-4 backdrop-blur-sm dark:bg-slate-950/75 sm:items-start sm:px-4 sm:pt-[10vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Buscar estudantes" className="max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-t-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-black/20 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100 sm:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800 sm:gap-3 sm:px-5">
              <Search className="h-5 w-5 shrink-0 text-sky-400" />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
                if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
                if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]); }
              }} placeholder="Nome, matrícula ou período..." aria-label="Buscar por nome, matrícula ou período" className="h-14 min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500 sm:h-16" />
              <kbd className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">ESC</kbd>
            </div>
            <div className="max-h-[calc(88dvh-9rem)] overflow-y-auto p-2 sm:max-h-[min(60vh,520px)]" role="listbox" aria-label="Resultados">
              {!query.trim() ? <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Busque estudantes por nome, matrícula ou período.</p> : results.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum estudante encontrado.</p> : results.map((student, index) => (
                <button key={student.id} type="button" role="option" aria-selected={activeIndex === index} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(student)} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition sm:gap-4 sm:px-4 ${activeIndex === index ? 'bg-sky-500/15 ring-1 ring-inset ring-sky-400/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'}`}>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{student.canonicalName}</span>{student.matricula && <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{student.matricula}</span>}</span>
                  <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{student.cohort}</span>
                </button>
              ))}
            </div>
            <footer className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:gap-4 sm:px-5"><span>↑↓ navegar</span><span>↵ selecionar e centralizar</span><span>ESC fechar</span></footer>
          </section>
        </div>
      )}
    </>
  );
}

export default CommandSearch;
