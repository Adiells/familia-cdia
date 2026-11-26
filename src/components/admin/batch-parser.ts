import type { SigaaStudentRecord, StudentNodeData } from '../../data/types';
import { normalizeSearchText } from '../../lib/search';

export const SEMESTER_PATTERN = /^20\d{2}\.[12]$/;
export const YEAR_ONLY_PATTERN = /^20\d{2}$/;

export type ParticipantMode = 'sigaa' | 'external';

export type ParticipantDraft = {
  mode: ParticipantMode;
  query: string;
  picked: SigaaStudentRecord | null;
  name: string;
  cohort: string;
};

export type ApiParticipantPayload =
  | { matricula: string }
  | { name: string; cohort: string };

export type ResolvedParticipant =
  | { kind: 'sigaa'; record: SigaaStudentRecord; payload: { matricula: string }; matchName: string }
  | { kind: 'external'; name: string; cohort: string; payload: { name: string; cohort: string }; matchName: string };

export type ModalTab = 'single' | 'standalone' | 'batch';

export type ResolvedBatchRow = {
  child: SigaaStudentRecord;
  godparents: SigaaStudentRecord[];
  semester: string;
};

export const emptyParticipant = (mode: ParticipantMode = 'sigaa'): ParticipantDraft => ({
  mode,
  query: '',
  picked: null,
  name: '',
  cohort: '',
});

export function normalizeCohortInput(value: string): string | null {
  const trimmed = value.trim();
  if (SEMESTER_PATTERN.test(trimmed)) return trimmed;
  if (YEAR_ONLY_PATTERN.test(trimmed)) return `${trimmed}.1`;
  return null;
}

export function getExternalNameError(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  const words = normalizeSearchText(cleaned).split(' ').filter(Boolean);
  if (cleaned.length < 5 || words.length < 2) {
    return 'Informe nome e sobrenome (mínimo 5 caracteres).';
  }
  return null;
}

export function getExternalCohortError(value: string): string | null {
  if (!normalizeCohortInput(value)) {
    return 'Use AAAA.1, AAAA.2 ou AAAA (ex.: 2020.1 ou 2020).';
  }
  return null;
}

export function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseRows(input: string, filename: string): Record<string, unknown>[] {
  if (filename.toLowerCase().endsWith('.json') || input.trim().startsWith('[')) {
    const parsed: unknown = JSON.parse(input);
    if (!Array.isArray(parsed)) throw new Error('O JSON precisa conter uma lista de apadrinhamentos.');
    return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  }
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('O CSV precisa de cabeçalho e ao menos uma linha.');
  const delimiter = [',', ';', '|'].sort(
    (a, b) => splitDelimitedLine(lines[0], b).length - splitDelimitedLine(lines[0], a).length
  )[0];
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => normalizeSearchText(header));
  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

export function resolveBatchRows(
  rows: Record<string, unknown>[],
  sigaaStudents: SigaaStudentRecord[],
  directoryByName: Map<string, StudentNodeData>
): { resolvedRows: ResolvedBatchRow[]; errors: string[] } {
  const resolvedRows: ResolvedBatchRow[] = [];
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

  return { resolvedRows, errors };
}
