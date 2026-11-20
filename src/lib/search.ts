import type { StudentNodeData } from '../data/types';

/** Lowercase, remove accents and punctuation while preserving digits and semester dots. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(a: string, b: string): number {
  if (!a) return b.length;
  if (!b) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function fuzzyTokenMatch(queryToken: string, candidateTokens: string[]): boolean {
  return candidateTokens.some((token) => {
    if (token.startsWith(queryToken) || queryToken.startsWith(token)) return true;
    const longest = Math.max(token.length, queryToken.length);
    return longest >= 4 && editDistance(queryToken, token) <= (longest >= 8 ? 2 : 1);
  });
}

function scoreStudent(query: string, student: StudentNodeData): number {
  const fields = [
    student.canonicalName,
    student.displayName,
    student.matricula ?? '',
    student.cohort,
    ...student.aliases,
  ].map(normalizeSearchText).filter(Boolean);
  const tokens = query.split(' ').filter(Boolean);
  let best = 0;

  for (const field of fields) {
    if (field === query) best = Math.max(best, 100);
    else if (field.startsWith(query)) best = Math.max(best, 90);
    else if (field.includes(query)) best = Math.max(best, 80);
    const fieldTokens = field.split(' ');
    const matching = tokens.filter((token) => fuzzyTokenMatch(token, fieldTokens)).length;
    if (matching === tokens.length && tokens.length) best = Math.max(best, 65 + matching);
    else if (matching) best = Math.max(best, 20 + matching * 5);
  }
  return best;
}

/** Search official names, display names, registration, cohort, and every PDF alias. */
export function searchStudents(
  students: readonly StudentNodeData[],
  query: string,
  limit = 50
): StudentNodeData[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return students
    .map((student, index) => ({ student, index, score: scoreStudent(normalized, student) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ student }) => student);
}
