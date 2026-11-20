'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileUp, Plus, Search, X } from 'lucide-react';
import type { SigaaStudentRecord, SponsorshipEdgeData, StudentNodeData } from '../../data/types';
import canonicalStudents from '../../data/students.json';
import canonicalSponsorships from '../../data/sponsorships.json';
import sigaaDirectory from '../../data/sigaa-students.json';

const defaultStudents = canonicalStudents as unknown as StudentNodeData[];
const defaultSponsorships = canonicalSponsorships as unknown as SponsorshipEdgeData[];
const defaultSigaaStudents = sigaaDirectory as unknown as SigaaStudentRecord[];
import { normalizeSearchText } from '../../lib/search';

const STORAGE_KEY = 'familia-cdia:user-additions:v1';
type StudentAddition = Pick<StudentNodeData, 'id' | 'canonicalName' | 'displayName' | 'matricula' | 'cohort' | 'aliases' | 'sigaaVerified' | 'matchConfidence'>;
type StoredAdditions = { students: StudentAddition[]; sponsorships: SponsorshipEdgeData[] };
type Draft = { calouro: string; p2: string; veterano: string; semester: string };
const emptyDraft = (): Draft => ({ calouro: '', p2: '', veterano: '', semester: '2026.1' });

export interface AddSponsorshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students?: StudentNodeData[];
  sponsorships?: SponsorshipEdgeData[];
  sigaaStudents?: SigaaStudentRecord[];
  onDataChange?: (data: { students: StudentNodeData[]; sponsorships: SponsorshipEdgeData[] }) => void;
}

function parseRows(input: string, filename: string): Record<string, unknown>[] {
  if (filename.toLowerCase().endsWith('.json') || input.trim().startsWith('[')) {
    const parsed: unknown = JSON.parse(input);
    if (!Array.isArray(parsed)) throw new Error('O JSON precisa conter uma lista de apadrinhamentos.');
    return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  }
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('O CSV precisa de cabeçalho e ao menos uma linha.');
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((header) => normalizeSearchText(header));
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

export function AddSponsorshipModal({ open, onOpenChange, students = defaultStudents, sponsorships = defaultSponsorships, sigaaStudents = defaultSigaaStudents, onDataChange }: AddSponsorshipModalProps) {
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [picked, setPicked] = useState<Record<'calouro' | 'p2' | 'veterano', SigaaStudentRecord | null>>({ calouro: null, p2: null, veterano: null });
  const [batchText, setBatchText] = useState('');
  const [status, setStatus] = useState('');
  const [additions, setAdditions] = useState<StoredAdditions>({ students: [], sponsorships: [] });
  const [hydrated, setHydrated] = useState(false);
  const [serverData, setServerData] = useState<{ students: StudentNodeData[]; sponsorships: SponsorshipEdgeData[] } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value: unknown = JSON.parse(raw);
        if (value && typeof value === 'object' && Array.isArray((value as StoredAdditions).students) && Array.isArray((value as StoredAdditions).sponsorships)) setAdditions(value as StoredAdditions);
      }
    } catch { setStatus('Não foi possível ler os dados locais salvos.'); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(additions)); }, [additions, hydrated]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/sponsorships', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Falha ao atualizar os dados do servidor.');
      return response.json() as Promise<{ students: StudentNodeData[]; sponsorships: SponsorshipEdgeData[] }>;
    }).then((data) => { if (!cancelled) setServerData(data); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [open]);

  const baseStudents = serverData?.students ?? students;
  const baseSponsorships = serverData?.sponsorships ?? sponsorships;
  const allStudents = useMemo(() => {
    const map = new Map(baseStudents.map((student) => [student.id, student]));
    additions.students.forEach((student) => map.set(student.id, student as StudentNodeData));
    return [...map.values()];
  }, [baseStudents, additions.students]);
  const allEdges = useMemo(() => [...new Map([...baseSponsorships, ...additions.sponsorships].map((edge) => [edge.id, edge])).values()], [baseSponsorships, additions.sponsorships]);
  const directoryByName = useMemo(() => {
    const byKey = new Map<string, StudentNodeData>();
    allStudents.forEach((student) => [student.canonicalName, student.displayName, student.matricula ?? '', ...student.aliases].filter(Boolean).forEach((name) => byKey.set(normalizeSearchText(name), student)));
    sigaaStudents.forEach((record) => {
      const existing = record.matricula ? allStudents.find((student) => student.matricula === record.matricula) : allStudents.find((student) => normalizeSearchText(student.canonicalName) === normalizeSearchText(record.name));
      if (existing) [record.name, record.matricula].forEach((key) => byKey.set(normalizeSearchText(key), existing));
    });
    return byKey;
  }, [allStudents, sigaaStudents]);

  if (!open) return null;

  const addRows = async (rows: { records: [SigaaStudentRecord, SigaaStudentRecord, SigaaStudentRecord]; semester: string }[]) => {
    const response = await fetch('/api/sponsorships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trios: rows.map((row) => ({
        calouroMatricula: row.records[0].matricula,
        p2Matricula: row.records[1].matricula,
        veteranoMatricula: row.records[2].matricula,
        semester: row.semester,
      })) }),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : 'Falha ao salvar no servidor.';
      throw new Error(message);
    }
    if (!result || typeof result !== 'object' || !Array.isArray((result as { students?: unknown }).students) || !Array.isArray((result as { sponsorships?: unknown }).sponsorships)) {
      throw new Error('Resposta inválida do servidor.');
    }
    const savedStudents = (result as { students: StudentNodeData[] }).students;
    const savedSponsorships = (result as { sponsorships: SponsorshipEdgeData[] }).sponsorships;
    const knownStudentIds = new Set(baseStudents.map((student) => student.id));
    const knownEdgeIds = new Set(baseSponsorships.map((edge) => edge.id));
    const nextAdditions = {
      students: savedStudents.filter((student) => !knownStudentIds.has(student.id)),
      sponsorships: savedSponsorships.filter((edge) => !knownEdgeIds.has(edge.id)),
    };
    setAdditions(nextAdditions);
    setServerData({ students: savedStudents, sponsorships: savedSponsorships });
    onDataChange?.({ students: savedStudents, sponsorships: savedSponsorships });
    return (result as { addedSponsorships?: number }).addedSponsorships ?? 0;
  };
  const selectRecord = (key: 'calouro' | 'p2' | 'veterano', record: SigaaStudentRecord) => {
    setPicked((current) => ({ ...current, [key]: record }));
    setDraft((current) => ({ ...current, [key]: record.name }));
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ students: allStudents, sponsorships: allEdges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'familia-cdia-atualizado.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const importBatch = async (input = batchText, filename = 'input.csv') => {
    try {
      const rows = parseRows(input, filename);
      const resolvedRows: { records: [SigaaStudentRecord, SigaaStudentRecord, SigaaStudentRecord]; semester: string }[] = [];
      const errors: string[] = [];
      rows.forEach((row, index) => {
        const get = (...names: string[]) => { for (const name of names) { const value = row[normalizeSearchText(name)]; if (typeof value === 'string' && value.trim()) return value.trim(); } return ''; };
        const names = [get('calouro', 'godchild', 'estudante'), get('p2', 'padrinho p2'), get('veterano', 'padrinho veterano')];
        const records = names.map((name) => {
          const known = directoryByName.get(normalizeSearchText(name));
          if (known?.matricula) return sigaaStudents.find((record) => record.matricula === known.matricula) ?? null;
          return sigaaStudents.find((record) => normalizeSearchText(record.name) === normalizeSearchText(name)) ?? null;
        });
        if (records.some((record) => !record) || new Set(records.map((record) => record?.matricula ?? record?.name)).size !== 3) errors.push(`Linha ${index + 2}: estudante não localizado unicamente no SIGAA.`);
        else resolvedRows.push({ records: records as [SigaaStudentRecord, SigaaStudentRecord, SigaaStudentRecord], semester: get('semester', 'semestre') || '2026.1' });
      });
      if (resolvedRows.length) {
        const count = await addRows(resolvedRows);
        setStatus(`${resolvedRows.length} trios processados; ${count} novos vínculos salvos. ${errors.slice(0, 3).join(' ')}`);
      } else setStatus(errors.slice(0, 3).join(' ') || 'Nenhum trio válido encontrado.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Arquivo inválido.'); }
  };

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 px-0 pt-4 backdrop-blur-sm dark:bg-slate-950/75 sm:items-start sm:px-4 sm:pt-[10vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="add-sponsorship-title" className="max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100 sm:rounded-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5"><div><h2 id="add-sponsorship-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">Novo apadrinhamento</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Escolha os estudantes no cadastro ativo do SIGAA para manter os vínculos sem duplicatas.</p></div><button type="button" onClick={() => onOpenChange(false)} aria-label="Fechar" className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button></header>
      <div className="flex gap-2 border-b border-slate-200 px-4 pt-3 dark:border-slate-800 sm:px-5 sm:pt-4"><button type="button" onClick={() => setTab('single')} className={`min-h-11 rounded-t-lg px-4 py-2 text-sm ${tab === 'single' ? 'bg-slate-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400'}`}>Um trio</button><button type="button" onClick={() => setTab('batch')} className={`min-h-11 rounded-t-lg px-4 py-2 text-sm ${tab === 'batch' ? 'bg-slate-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400'}`}>CSV / JSON</button></div>
      {tab === 'single' ? <div className="space-y-4 p-4 sm:p-5">
        {(['calouro', 'p2', 'veterano'] as const).map((key) => <label key={key} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{key === 'calouro' ? 'Calouro(a)' : key === 'p2' ? '1º Padrinho / Madrinha' : '2º Padrinho / Madrinha (opcional ou dupla)'}
          <div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={draft[key]} onChange={(event) => { setDraft((current) => ({ ...current, [key]: event.target.value })); setPicked((current) => ({ ...current, [key]: null })); }} placeholder="Busque o nome oficial ou matrícula..." className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 sm:text-sm" />
            {draft[key] && !picked[key] && <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">{sigaaStudents.filter((record) => normalizeSearchText(`${record.name} ${record.matricula}`).includes(normalizeSearchText(draft[key]))).slice(0, 8).map((record) => <button key={record.matricula} type="button" onClick={() => selectRecord(key, record)} className="block min-h-14 w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"><span className="block text-sm text-slate-900 dark:text-slate-100">{record.name}</span><span className="text-xs text-slate-600 dark:text-slate-400">{record.matricula}</span></button>)}</div>}
          </div>{picked[key] && <span className="mt-1 block text-xs text-emerald-700 dark:text-emerald-300">SIGAA: {picked[key]?.matricula}</span>}
        </label>)}
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Semestre do vínculo<input value={draft.semester} onChange={(event) => setDraft((current) => ({ ...current, semester: event.target.value }))} className="mt-1 block min-h-11 w-40 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 sm:text-sm" /></label>
        <button type="button" disabled={!picked.calouro || !picked.p2 || !picked.veterano || !draft.semester.trim()} onClick={async () => { try { const count = await addRows([{ records: [picked.calouro!, picked.p2!, picked.veterano!], semester: draft.semester.trim() }]); setStatus(count ? 'Trio salvo no servidor e neste navegador.' : 'Este trio já existia; os dados foram sincronizados.'); setDraft(emptyDraft()); setPicked({ calouro: null, p2: null, veterano: null }); } catch (error) { setStatus(error instanceof Error ? error.message : 'Falha ao salvar.'); } }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"><Plus className="h-4 w-4" />Adicionar trio</button>
      </div> : <div className="space-y-3 p-4 sm:p-5"><p className="text-sm text-slate-600 dark:text-slate-400">Use colunas <code className="text-slate-800 dark:text-slate-200">calouro,p2,veterano,semestre</code> (ou equivalentes em JSON). Os três nomes precisam corresponder a estudantes SIGAA.</p><textarea value={batchText} onChange={(event) => setBatchText(event.target.value)} rows={7} placeholder={'calouro,p2,veterano,semestre\nNome Calouro,Nome P2,Nome Veterano,2026.1'} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100" /><div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><button type="button" onClick={() => void importBatch()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"><FileUp className="h-4 w-4" />Importar conteúdo</button><label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:border-sky-500/50 dark:border-slate-700 dark:text-slate-200"><FileUp className="h-4 w-4" />Selecionar CSV/JSON<input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={async (event) => { const file = event.currentTarget.files?.[0]; if (!file) return; const text = await file.text(); setBatchText(text); await importBatch(text, file.name); event.currentTarget.value = ''; }} /></label></div></div>}
      <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p role="status" className="text-xs text-slate-600 dark:text-slate-400">{status || `${allStudents.length} estudantes · ${allEdges.length} vínculos`}</p><button type="button" onClick={exportData} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:border-sky-500/50 dark:border-slate-700 dark:text-slate-200"><Download className="h-4 w-4" />Baixar JSON atualizado</button></footer>
    </section>
  </div>;
}

export default AddSponsorshipModal;
