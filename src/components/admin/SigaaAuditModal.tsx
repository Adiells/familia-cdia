'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, GraduationCap, Search, X } from 'lucide-react';
import type { ReconciliationAuditEntry, StudentNodeData } from '../../data/types';
import canonicalStudents from '../../data/students.json';
import reconciliationAudit from '../../data/reconciliation-audit.json';

const defaultStudents = canonicalStudents as unknown as StudentNodeData[];
const defaultAuditEntries = reconciliationAudit as unknown as ReconciliationAuditEntry[];
import { normalizeSearchText } from '../../lib/search';

export interface SigaaAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditEntries?: ReconciliationAuditEntry[];
  students?: StudentNodeData[];
}

const confidenceLabel: Record<ReconciliationAuditEntry['matchConfidence'], string> = {
  EXACT: 'Nome exato', TOKEN_SUBSET: 'Tokens / nome abreviado', FUZZY: 'Similaridade ortográfica', PDF_ONLY: 'Somente PDF',
};

export function SigaaAuditModal({ open, onOpenChange, auditEntries = defaultAuditEntries, students = defaultStudents }: SigaaAuditModalProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'directory' | 'audit'>('directory');
  const normalized = normalizeSearchText(query);
  const directory = useMemo(() => students.filter((student) => !normalized || normalizeSearchText([student.canonicalName, student.displayName, student.matricula ?? '', student.cohort, ...student.aliases].join(' ')).includes(normalized)).sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, 'pt-BR')), [students, normalized]);
  const audit = useMemo(() => auditEntries.filter((entry) => !normalized || normalizeSearchText([entry.rawName, entry.canonicalName, entry.matricula ?? '', entry.sourceDoc, entry.explanation, confidenceLabel[entry.matchConfidence]].join(' ')).includes(normalized)).sort((a, b) => a.sourceDoc.localeCompare(b.sourceDoc) || a.rawName.localeCompare(b.rawName, 'pt-BR')), [auditEntries, normalized]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="sigaa-audit-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-800 p-5"><div><h2 id="sigaa-audit-title" className="text-lg font-bold text-slate-100">Diretório CDIA & reconciliação SIGAA</h2><p className="mt-1 text-sm text-slate-400">Consulte o vínculo entre os nomes extraídos dos PDFs e os registros oficiais de estudantes ativos.</p></div><button type="button" onClick={() => onOpenChange(false)} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></header>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-5 pt-4"><button type="button" onClick={() => setTab('directory')} className={`rounded-t-lg px-4 py-2 text-sm ${tab === 'directory' ? 'bg-slate-800 text-sky-300' : 'text-slate-400'}`}>Diretório ({students.length})</button><button type="button" onClick={() => setTab('audit')} className={`rounded-t-lg px-4 py-2 text-sm ${tab === 'audit' ? 'bg-slate-800 text-sky-300' : 'text-slate-400'}`}>Auditoria ({auditEntries.length})</button><label className="relative ml-auto mb-2 block w-full sm:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Filtrar diretório e auditoria" placeholder="Filtrar nome, matrícula, alias..." className="w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-sky-500" /></label></div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'directory' ? <table className="w-full min-w-[720px] text-left text-sm"><thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Estudante</th><th className="px-4 py-3">Matrícula</th><th className="px-4 py-3">Ingresso</th><th className="px-4 py-3">Origem</th><th className="px-5 py-3">Aliases dos PDFs</th></tr></thead><tbody className="divide-y divide-slate-800/80">{directory.map((student) => <tr key={student.id} className="hover:bg-slate-800/35"><td className="px-5 py-3"><span className="block font-medium text-slate-100">{student.canonicalName}</span>{student.displayName !== student.canonicalName && <span className="block text-xs text-slate-500">Exibido como {student.displayName}</span>}</td><td className="px-4 py-3 font-mono text-xs text-slate-300">{student.matricula || '—'}</td><td className="px-4 py-3"><span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">{student.cohort}</span></td><td className="px-4 py-3">{student.sigaaVerified ? <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><BadgeCheck className="h-4 w-4" /> SIGAA ativo</span> : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><GraduationCap className="h-4 w-4" /> Histórico PDF</span>}</td><td className="max-w-sm px-5 py-3 text-xs text-slate-400">{student.aliases.length ? student.aliases.join(' · ') : '—'}</td></tr>)}</tbody></table> : <table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Nome no PDF</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Correspondência oficial</th><th className="px-4 py-3">Critério</th><th className="px-5 py-3">Explicação</th></tr></thead><tbody className="divide-y divide-slate-800/80">{audit.map((entry, index) => <tr key={`${entry.sourceDoc}:${entry.rawName}:${index}`} className="align-top hover:bg-slate-800/35"><td className="px-5 py-3 font-medium text-slate-200">{entry.rawName}</td><td className="px-4 py-3 text-xs text-slate-400">{entry.sourceDoc}</td><td className="px-4 py-3"><span className="block text-slate-100">{entry.canonicalName}</span><span className="font-mono text-xs text-slate-500">{entry.matricula || entry.resolvedStudentId}</span></td><td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[11px] ${entry.matchConfidence === 'PDF_ONLY' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-sky-500/30 bg-sky-500/10 text-sky-300'}`}>{confidenceLabel[entry.matchConfidence]}</span></td><td className="max-w-md px-5 py-3 text-xs leading-relaxed text-slate-400">{entry.explanation}</td></tr>)}</tbody></table>}
        {((tab === 'directory' && directory.length === 0) || (tab === 'audit' && audit.length === 0)) && <p className="p-12 text-center text-sm text-slate-400">Nenhum registro corresponde à busca.</p>}
      </div>
      <footer className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">{tab === 'directory' ? `${directory.length} estudantes exibidos` : `${audit.length} correspondências exibidas`}</footer>
    </section>
  </div>;
}

export default SigaaAuditModal;
