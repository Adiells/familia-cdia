'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileUp, Plus, Search, UserPlus, X } from 'lucide-react';
import type { SigaaStudentRecord, SponsorshipEdgeData, StudentNodeData } from '../../data/types';
import canonicalStudents from '../../data/students.json';
import canonicalSponsorships from '../../data/sponsorships.json';
import sigaaDirectory from '../../data/sigaa-students.json';
import { getSponsorshipsApiUrl } from '../../lib/api';
import { normalizeSearchText } from '../../lib/search';

const defaultStudents = canonicalStudents as unknown as StudentNodeData[];
const defaultSponsorships = canonicalSponsorships as unknown as SponsorshipEdgeData[];
const defaultSigaaStudents = sigaaDirectory as unknown as SigaaStudentRecord[];

const SEMESTER_PATTERN = /^20\d{2}\.[12]$/;
const YEAR_ONLY_PATTERN = /^20\d{2}$/;

type ParticipantMode = 'sigaa' | 'external';
type ParticipantDraft = {
  mode: ParticipantMode;
  query: string;
  picked: SigaaStudentRecord | null;
  name: string;
  cohort: string;
};
type ApiParticipantPayload =
  | { matricula: string }
  | { name: string; cohort: string };

type ResolvedParticipant =
  | { kind: 'sigaa'; record: SigaaStudentRecord; payload: { matricula: string }; matchName: string }
  | { kind: 'external'; name: string; cohort: string; payload: { name: string; cohort: string }; matchName: string };

type ModalTab = 'single' | 'standalone' | 'batch';

const emptyParticipant = (mode: ParticipantMode = 'sigaa'): ParticipantDraft => ({
  mode,
  query: '',
  picked: null,
  name: '',
  cohort: '',
});

function normalizeCohortInput(value: string): string | null {
  const trimmed = value.trim();
  if (SEMESTER_PATTERN.test(trimmed)) return trimmed;
  if (YEAR_ONLY_PATTERN.test(trimmed)) return `${trimmed}.1`;
  return null;
}

function getExternalNameError(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  const words = normalizeSearchText(cleaned).split(' ').filter(Boolean);
  if (cleaned.length < 5 || words.length < 2) {
    return 'Informe nome e sobrenome (mínimo 5 caracteres).';
  }
  return null;
}

function getExternalCohortError(value: string): string | null {
  if (!normalizeCohortInput(value)) {
    return 'Use AAAA.1, AAAA.2 ou AAAA (ex.: 2020.1 ou 2020).';
  }
  return null;
}

interface ParticipantInputProps {
  label: string;
  value: ParticipantDraft;
  onChange: (next: ParticipantDraft) => void;
  sigaaStudents: SigaaStudentRecord[];
  placeholder?: string;
  onRemove?: () => void;
  removeLabel?: string;
}

function ParticipantInput({
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

export interface AddSponsorshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students?: StudentNodeData[];
  sponsorships?: SponsorshipEdgeData[];
  sigaaStudents?: SigaaStudentRecord[];
  onDataChange?: (data: { students: StudentNodeData[]; sponsorships: SponsorshipEdgeData[]; addedChildId?: string }) => void;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function parseRows(input: string, filename: string): Record<string, unknown>[] {
  if (filename.toLowerCase().endsWith('.json') || input.trim().startsWith('[')) {
    const parsed: unknown = JSON.parse(input);
    if (!Array.isArray(parsed)) throw new Error('O JSON precisa conter uma lista de apadrinhamentos.');
    return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  }
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('O CSV precisa de cabeçalho e ao menos uma linha.');
  const delimiter = [',', ';', '|'].sort((a, b) => splitDelimitedLine(lines[0], b).length - splitDelimitedLine(lines[0], a).length)[0];
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => normalizeSearchText(header));
  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

export function AddSponsorshipModal({
  open,
  onOpenChange,
  students = defaultStudents,
  sponsorships = defaultSponsorships,
  sigaaStudents = defaultSigaaStudents,
  onDataChange,
}: AddSponsorshipModalProps) {
  const [tab, setTab] = useState<ModalTab>('single');
  const [childDraft, setChildDraft] = useState<ParticipantDraft>(() => emptyParticipant('sigaa'));
  const [godparentDrafts, setGodparentDrafts] = useState<ParticipantDraft[]>(() => [emptyParticipant('sigaa')]);
  const [semester, setSemester] = useState('2026.2');
  const [standaloneDraft, setStandaloneDraft] = useState<ParticipantDraft>(() => emptyParticipant('external'));
  const [batchText, setBatchText] = useState('');
  const [status, setStatus] = useState('');
  const [statusError, setStatusError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [moderationEnabled, setModerationEnabled] = useState(false);
  const [serverData, setServerData] = useState<{ students: StudentNodeData[]; sponsorships: SponsorshipEdgeData[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(getSponsorshipsApiUrl(), { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Falha ao atualizar os dados do servidor.');
        return response.json() as Promise<{
          students: StudentNodeData[];
          sponsorships: SponsorshipEdgeData[];
          moderationEnabled?: boolean;
        }>;
      })
      .then((data) => {
        if (!cancelled) {
          setServerData({ students: data.students, sponsorships: data.sponsorships });
          setModerationEnabled(Boolean(data.moderationEnabled));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  const allStudents = serverData?.students ?? students;
  const allEdges = serverData?.sponsorships ?? sponsorships;

  const directoryByName = useMemo(() => {
    const byKey = new Map<string, StudentNodeData>();
    allStudents.forEach((student) =>
      [student.canonicalName, student.displayName, student.matricula ?? '', ...student.aliases]
        .filter(Boolean)
        .forEach((name) => byKey.set(normalizeSearchText(name), student))
    );
    sigaaStudents.forEach((record) => {
      const existing = record.matricula
        ? allStudents.find((student) => student.matricula === record.matricula)
        : allStudents.find((student) => normalizeSearchText(student.canonicalName) === normalizeSearchText(record.name));
      if (existing) [record.name, record.matricula].forEach((key) => byKey.set(normalizeSearchText(key), existing));
    });
    return byKey;
  }, [allStudents, sigaaStudents]);

  const resolveSigaaQuery = useCallback(
    (query: string, picked: SigaaStudentRecord | null): SigaaStudentRecord | null => {
      if (picked) return picked;
      const q = normalizeSearchText(query);
      if (!q) return null;
      const exact = sigaaStudents.find(
        (r) => normalizeSearchText(r.name) === q || normalizeSearchText(r.matricula) === q
      );
      if (exact) return exact;
      const known = directoryByName.get(q);
      if (known?.matricula) {
        const fromSigaa = sigaaStudents.find((r) => r.matricula === known.matricula);
        if (fromSigaa) return fromSigaa;
      }
      const matches = sigaaStudents.filter((r) => normalizeSearchText(`${r.name} ${r.matricula}`).includes(q));
      if (matches.length === 1) return matches[0];
      return null;
    },
    [sigaaStudents, directoryByName]
  );

  const resolveDraftParticipant = useCallback(
    (draft: ParticipantDraft): ResolvedParticipant | null => {
      if (draft.mode === 'sigaa') {
        const record = resolveSigaaQuery(draft.query, draft.picked);
        if (!record) return null;
        return {
          kind: 'sigaa',
          record,
          payload: { matricula: record.matricula },
          matchName: record.name,
        };
      }
      const cleanedName = draft.name.trim().replace(/\s+/g, ' ');
      if (getExternalNameError(cleanedName)) return null;
      const cohort = normalizeCohortInput(draft.cohort);
      if (!cohort) return null;
      return {
        kind: 'external',
        name: cleanedName,
        cohort,
        payload: { name: cleanedName, cohort },
        matchName: cleanedName,
      };
    },
    [resolveSigaaQuery]
  );

  const resolvedChild = useMemo(
    () => resolveDraftParticipant(childDraft),
    [childDraft, resolveDraftParticipant]
  );
  const resolvedGodparents = useMemo(
    () => godparentDrafts.map((item) => resolveDraftParticipant(item)),
    [godparentDrafts, resolveDraftParticipant]
  );
  const allGodparentsResolved =
    resolvedGodparents.length > 0 && resolvedGodparents.every((item): item is ResolvedParticipant => Boolean(item));
  const semesterValid = SEMESTER_PATTERN.test(semester.trim());

  const resolvedStandalone = useMemo(
    () => resolveDraftParticipant(standaloneDraft),
    [standaloneDraft, resolveDraftParticipant]
  );

  if (!open) return null;

  const submitToApi = async (
    body: {
      trios?: { calouro: ApiParticipantPayload; godparents: ApiParticipantPayload[]; semester: string }[];
      standaloneStudents?: ApiParticipantPayload[];
    },
    focusTarget?: ResolvedParticipant
  ) => {
    let response: Response;
    try {
      response = await fetch(getSponsorshipsApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('Não foi possível conectar à API. Os dados só podem ser salvos quando o servidor estiver online.');
    }
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      if (!response.ok) {
        throw new Error(`API indisponível ou inacessível (HTTP ${response.status}). Os dados não foram salvos.`);
      }
      throw new Error('Resposta inválida da API. Os dados não foram salvos.');
    }
    if (!response.ok) {
      const message =
        result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
          ? result.error
          : `Falha ao salvar na API (HTTP ${response.status}). Verifique se o servidor está online.`;
      throw new Error(message);
    }
    if (!result || typeof result !== 'object') {
      throw new Error('Resposta inválida do servidor.');
    }
    const payload = result as {
      pending?: boolean;
      requestId?: string;
      message?: string;
      students?: unknown;
      sponsorships?: unknown;
      addedStudents?: number;
      addedSponsorships?: number;
    };
    const hasCollections = Array.isArray(payload.students) && Array.isArray(payload.sponsorships);
    if (payload.pending) {
      if (hasCollections) {
        setServerData({
          students: payload.students as StudentNodeData[],
          sponsorships: payload.sponsorships as SponsorshipEdgeData[],
        });
      }
      setModerationEnabled(true);
      return {
        pending: true as const,
        requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined,
        message:
          typeof payload.message === 'string' && payload.message.trim()
            ? payload.message
            : 'Solicitação enviada para aprovação dos mantenedores.',
        addedStudents: 0,
        addedSponsorships: 0,
      };
    }
    if (!hasCollections) {
      throw new Error('Resposta inválida do servidor.');
    }
    const savedStudents = payload.students as StudentNodeData[];
    const savedSponsorships = payload.sponsorships as SponsorshipEdgeData[];
    const matchedFocus = focusTarget
      ? savedStudents.find(
          (student) =>
            (focusTarget.kind === 'sigaa' && student.matricula === focusTarget.record.matricula) ||
            normalizeSearchText(student.canonicalName) === normalizeSearchText(focusTarget.matchName)
        )
      : undefined;
    setServerData({ students: savedStudents, sponsorships: savedSponsorships });
    onDataChange?.({
      students: savedStudents,
      sponsorships: savedSponsorships,
      addedChildId: matchedFocus?.id,
    });
    return {
      pending: false as const,
      addedStudents: payload.addedStudents ?? 0,
      addedSponsorships: payload.addedSponsorships ?? 0,
    };
  };

  const handleSingleSubmit = async () => {
    if (!resolvedChild || !allGodparentsResolved || !semesterValid) return;
    const validGodparents = resolvedGodparents as ResolvedParticipant[];
    setSubmitting(true);
    try {
      const saved = await submitToApi(
        {
          trios: [
            {
              calouro: resolvedChild.payload,
              godparents: validGodparents.map((item) => item.payload),
              semester: semester.trim(),
            },
          ],
        },
        resolvedChild
      );
      setStatusError(false);
      setStatus(
        saved.pending
          ? saved.message
          : saved.addedSponsorships
            ? `${validGodparents.length} padrinho(s)/madrinha(s) salvo(s) na API e exibido(s) na árvore!`
            : 'Estes vínculos já existiam; os dados foram sincronizados.'
      );
      setChildDraft(emptyParticipant('sigaa'));
      setGodparentDrafts([emptyParticipant('sigaa')]);
      setSemester('2026.2');
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : 'Falha ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStandaloneSubmit = async () => {
    if (!resolvedStandalone) return;
    setSubmitting(true);
    try {
      const saved = await submitToApi(
        { standaloneStudents: [resolvedStandalone.payload] },
        resolvedStandalone
      );
      setStatusError(false);
      setStatus(
        saved.pending
          ? saved.message
          : saved.addedStudents
            ? `${resolvedStandalone.matchName} cadastrado(a) na API e exibido(a) na árvore!`
            : `${resolvedStandalone.matchName} já constava na árvore; dados sincronizados.`
      );
      setStandaloneDraft(emptyParticipant('external'));
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : 'Falha ao cadastrar estudante.');
    } finally {
      setSubmitting(false);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ students: allStudents, sponsorships: allEdges }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'familia-cdia-atualizado.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBatch = async (input = batchText, filename = 'input.csv') => {
    try {
      const rows = parseRows(input, filename);
      const resolvedRows: { child: SigaaStudentRecord; godparents: SigaaStudentRecord[]; semester: string }[] = [];
      const errors: string[] = [];
      rows.forEach((row, index) => {
        const normalizedRow = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [normalizeSearchText(key), value])
        );
        const get = (...names: string[]) => {
          for (const name of names) {
            const value = normalizedRow[normalizeSearchText(name)];
            if (typeof value === 'string' && value.trim()) return value.trim();
          }
          return '';
        };
        const childName = get('calouro', 'godchild', 'estudante');
        const listValue = normalizedRow.godparents ?? normalizedRow.padrinhos;
        const godparentNames: string[] = Array.isArray(listValue)
          ? listValue
              .filter((name): name is string => typeof name === 'string')
              .map((name) => name.trim())
              .filter(Boolean)
          : typeof listValue === 'string'
            ? listValue
                .split(/[;|]/)
                .map((name) => name.trim())
                .filter(Boolean)
            : [];
        const numberedGodparents = Object.entries(normalizedRow)
          .map(([key, value]) => ({ match: key.match(/^(?:padrinho|madrinha|godparent)\s*(\d+)$/), value }))
          .filter(
            (entry): entry is { match: RegExpMatchArray; value: string } =>
              Boolean(entry.match) && typeof entry.value === 'string' && Boolean(entry.value.trim())
          )
          .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
          .map((entry) => entry.value.trim());
        godparentNames.push(...numberedGodparents);
        const singularGodparent = get('padrinho', 'madrinha', 'godparent');
        if (singularGodparent) godparentNames.push(singularGodparent);
        const names = [childName, ...godparentNames];
        const records = names.map((name) => {
          if (!name) return null;
          const known = directoryByName.get(normalizeSearchText(name));
          if (known?.matricula) return sigaaStudents.find((record) => record.matricula === known.matricula) ?? null;
          return sigaaStudents.find((record) => normalizeSearchText(record.name) === normalizeSearchText(name)) ?? null;
        });
        const resolved = records.filter((record): record is SigaaStudentRecord => Boolean(record));
        const uniqueMatriculas = new Set(resolved.map((record) => record.matricula));
        if (
          !childName ||
          godparentNames.length < 1 ||
          resolved.length !== names.length ||
          uniqueMatriculas.size !== resolved.length
        ) {
          errors.push(`Linha ${index + 2}: informe calouro(a) e ao menos um padrinho/madrinha SIGAA único.`);
        } else {
          resolvedRows.push({
            child: resolved[0],
            godparents: resolved.slice(1),
            semester: get('semester', 'semestre') || '2026.2',
          });
        }
      });
      if (resolvedRows.length) {
        setSubmitting(true);
        try {
          const lastChild = resolvedRows[resolvedRows.length - 1].child;
          const saved = await submitToApi(
            {
              trios: resolvedRows.map((row) => ({
                calouro: { matricula: row.child.matricula },
                godparents: row.godparents.map((record) => ({ matricula: record.matricula })),
                semester: row.semester,
              })),
            },
            {
              kind: 'sigaa',
              record: lastChild,
              payload: { matricula: lastChild.matricula },
              matchName: lastChild.name,
            }
          );
          setStatusError(false);
          setStatus(
            saved.pending
              ? `${saved.message} (${resolvedRows.length} item(ns)). ${errors.slice(0, 3).join(' ')}`.trim()
              : `${resolvedRows.length} apadrinhamento(s) processado(s); ${saved.addedSponsorships} novo(s) vínculo(s) salvo(s) na API. ${errors.slice(0, 3).join(' ')}`.trim()
          );
        } finally {
          setSubmitting(false);
        }
      } else {
        setStatusError(true);
        setStatus(errors.slice(0, 3).join(' ') || 'Nenhum trio válido encontrado.');
      }
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : 'Arquivo inválido.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 px-0 pt-4 backdrop-blur-sm dark:bg-slate-950/75 sm:items-start sm:px-4 sm:pt-[8vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-sponsorship-title"
        className="max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100 sm:rounded-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div>
            <h2 id="add-sponsorship-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Novo apadrinhamento
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Cadastre vínculos com estudantes ativos do SIGAA ou pessoas formadas (fora do SIGAA).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 pt-3 dark:border-slate-800 sm:px-5 sm:pt-4">
          <button
            type="button"
            onClick={() => setTab('single')}
            className={`min-h-11 rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === 'single'
                ? 'bg-slate-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Apadrinhamento
          </button>
          <button
            type="button"
            onClick={() => setTab('standalone')}
            className={`min-h-11 rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === 'standalone'
                ? 'bg-slate-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Sem afilhado
          </button>
          <button
            type="button"
            onClick={() => setTab('batch')}
            className={`min-h-11 rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === 'batch'
                ? 'bg-slate-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            CSV / JSON
          </button>
        </div>

        {tab === 'single' && (
          <div className="space-y-4 p-4 sm:p-5">
            <ParticipantInput
              label="Afilhado(a) / Calouro(a)"
              value={childDraft}
              onChange={setChildDraft}
              sigaaStudents={sigaaStudents}
              placeholder="Busque o nome oficial ou matrícula..."
            />

            <div className="space-y-3">
              {godparentDrafts.map((godparentDraft, index) => (
                <ParticipantInput
                  key={index}
                  label={`${index + 1}º Padrinho / Madrinha`}
                  value={godparentDraft}
                  onChange={(next) =>
                    setGodparentDrafts((current) =>
                      current.map((item, currentIndex) => (currentIndex === index ? next : item))
                    )
                  }
                  sigaaStudents={sigaaStudents}
                  onRemove={
                    index > 0
                      ? () =>
                          setGodparentDrafts((current) =>
                            current.filter((_, currentIndex) => currentIndex !== index)
                          )
                      : undefined
                  }
                  removeLabel={`Remover padrinho ${index + 1}`}
                />
              ))}
              <button
                type="button"
                onClick={() => setGodparentDrafts((current) => [...current, emptyParticipant('sigaa')])}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-sky-500 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-sky-300"
              >
                <Plus className="h-4 w-4" />
                Adicionar outro padrinho/madrinha
              </button>
            </div>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Semestre do vínculo
              <input
                value={semester}
                onChange={(event) => setSemester(event.target.value)}
                placeholder="Ex.: 2026.2"
                className="mt-1 block min-h-11 w-40 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 sm:text-sm"
              />
              {semester.trim() && !semesterValid && (
                <span className="mt-1 block text-xs font-normal text-rose-600 dark:text-rose-400">
                  Use o formato AAAA.1 ou AAAA.2 (ex.: 2026.2).
                </span>
              )}
            </label>

            <button
              type="button"
              disabled={submitting || !resolvedChild || !allGodparentsResolved || !semesterValid}
              onClick={() => void handleSingleSubmit()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" />
              {submitting
                ? moderationEnabled
                  ? 'Enviando...'
                  : 'Salvando...'
                : moderationEnabled
                  ? 'Solicitar apadrinhamento'
                  : 'Adicionar apadrinhamento'}
            </button>
          </div>
        )}

        {tab === 'standalone' && (
          <div className="space-y-4 p-4 sm:p-5">
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/90 px-3.5 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                Não recomendado: cadastrar um estudante sem afilhado cria um nó isolado na árvore. Sempre que possível,
                vincule um apadrinhamento.
              </p>
            </div>

            <ParticipantInput
              label="Estudante"
              value={standaloneDraft}
              onChange={setStandaloneDraft}
              sigaaStudents={sigaaStudents}
              placeholder="Busque no SIGAA por nome ou matrícula..."
            />

            <button
              type="button"
              disabled={submitting || !resolvedStandalone}
              onClick={() => void handleStandaloneSubmit()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              <UserPlus className="h-4 w-4" />
              {submitting
                ? moderationEnabled
                  ? 'Enviando...'
                  : 'Cadastrando...'
                : moderationEnabled
                  ? 'Solicitar cadastro'
                  : 'Cadastrar estudante'}
            </button>
          </div>
        )}

        {tab === 'batch' && (
          <div className="space-y-3 p-4 sm:p-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Use colunas como <code className="text-slate-800 dark:text-slate-200">calouro,padrinho1,padrinho2,semestre</code> ou{' '}
              <code className="text-slate-800 dark:text-slate-200">calouro,padrinhos,semestre</code>, com padrinhos separados por ; ou |.
              JSON aceita <code className="text-slate-800 dark:text-slate-200">godparents: []</code>.
            </p>
            <textarea
              value={batchText}
              onChange={(event) => setBatchText(event.target.value)}
              rows={7}
              placeholder={'calouro,padrinho1,padrinho2,semestre\nNome Calouro,Nome Padrinho 1,Nome Padrinho 2,2026.1'}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void importBatch()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                <FileUp className="h-4 w-4" />
                {submitting
                  ? moderationEnabled
                    ? 'Enviando...'
                    : 'Importando...'
                  : moderationEnabled
                    ? 'Enviar lote para aprovação'
                    : 'Importar conteúdo'}
              </button>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:border-sky-500/50 dark:border-slate-700 dark:text-slate-200">
                <FileUp className="h-4 w-4" />
                Selecionar CSV/JSON
                <input
                  type="file"
                  disabled={submitting}
                  accept=".csv,.json,text/csv,application/json"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.currentTarget.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setBatchText(text);
                    await importBatch(text, file.name);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p
            role={statusError ? 'alert' : 'status'}
            className={`text-xs ${
              statusError
                ? 'font-medium text-rose-600 dark:text-rose-400'
                : status
                  ? 'font-medium text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {status || `${allStudents.length} estudantes · ${allEdges.length} vínculos`}
          </p>
          <button
            type="button"
            onClick={exportData}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:border-sky-500/50 dark:border-slate-700 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            Baixar JSON atualizado
          </button>
        </footer>
      </section>
    </div>
  );
}

export default AddSponsorshipModal;
