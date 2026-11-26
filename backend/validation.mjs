export const semesterPattern = /^20\d{2}\.[12]$/;
export const yearOnlyPattern = /^20\d{2}$/;

export function normalizeName(value) {
  return value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function safeSlug(value) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function normalizeCohort(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (semesterPattern.test(trimmed)) return trimmed;
  if (yearOnlyPattern.test(trimmed)) return `${trimmed}.1`;
  return null;
}

export function parseParticipant(raw, label) {
  if (typeof raw === 'string') {
    const matricula = raw.trim();
    if (!matricula) return { error: `Matrícula obrigatória para ${label}.` };
    return { value: { kind: 'sigaa', matricula, key: `matricula:${matricula}` } };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: `Dados inválidos para ${label}.` };
  }
  if (typeof raw.matricula === 'string' && raw.matricula.trim()) {
    const matricula = raw.matricula.trim();
    return { value: { kind: 'sigaa', matricula, key: `matricula:${matricula}` } };
  }
  if (raw.name !== undefined || raw.cohort !== undefined) {
    const cleanedName = typeof raw.name === 'string' ? raw.name.trim().replace(/\s+/g, ' ') : '';
    const normalized = normalizeName(cleanedName);
    const words = normalized.split(' ').filter(Boolean);
    if (cleanedName.length < 5 || words.length < 2 || !safeSlug(cleanedName)) {
      return { error: `Informe o nome completo (nome e sobrenome, mínimo 5 caracteres) para ${label}.` };
    }
    const cohort = normalizeCohort(raw.cohort);
    if (!cohort) {
      return {
        error: `Período ou ano de ingresso inválido para ${label}. Use AAAA.1, AAAA.2 ou AAAA (ex.: 2020.1 ou 2020).`,
      };
    }
    return {
      value: {
        kind: 'external',
        name: cleanedName,
        normalizedName: normalized,
        cohort,
        key: `name:${normalized}`,
      },
    };
  }
  return { error: `Informe matrícula SIGAA ou nome completo e período de ingresso para ${label}.` };
}

export function parseTrio(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Apadrinhamento inválido.' };
  const rawChild = raw.calouro !== undefined ? raw.calouro : raw.calouroMatricula;
  const childResult = parseParticipant(rawChild, 'o(a) afilhado(a)');
  if (childResult.error) return { error: childResult.error };

  const rawGodparents = raw.godparents !== undefined ? raw.godparents : raw.godparentMatriculas;
  if (!Array.isArray(rawGodparents) || rawGodparents.length < 1 || rawGodparents.length > 50) {
    return { error: 'Informe de 1 a 50 padrinhos/madrinhas.' };
  }
  const godparents = [];
  for (let index = 0; index < rawGodparents.length; index += 1) {
    const godparentResult = parseParticipant(rawGodparents[index], `${index + 1}º padrinho/madrinha`);
    if (godparentResult.error) return { error: godparentResult.error };
    godparents.push(godparentResult.value);
  }

  const semester = raw.semester;
  if (typeof semester !== 'string' || !semesterPattern.test(semester.trim())) {
    return { error: 'Semestre inválido. Use o formato AAAA.1 ou AAAA.2.' };
  }

  const keys = [childResult.value.key, ...godparents.map((participant) => participant.key)];
  if (new Set(keys).size !== keys.length) {
    return { error: 'Afilhado(a) e padrinhos/madrinhas precisam ser pessoas distintas.' };
  }

  return {
    value: {
      calouro: childResult.value,
      godparents,
      semester: semester.trim(),
    },
  };
}

export function buildRequestSummary(resolvedTrios, resolvedStandalone) {
  const parts = [];
  for (const item of resolvedTrios) {
    const parents = item.godparents.map((student) => `${student.canonicalName} (${student.cohort})`).join(' + ');
    parts.push(`${parents} -> ${item.child.canonicalName} (${item.semester})`);
  }
  for (const student of resolvedStandalone) {
    parts.push(`Cadastro sem afilhado: ${student.canonicalName} (${student.cohort})`);
  }
  const full = parts.join('; ');
  return full.length > 500 ? `${full.slice(0, 497)}...` : full;
}
