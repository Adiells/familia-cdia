import { readFile } from 'node:fs/promises';

const root = new URL('../src/data/', import.meta.url);
const load = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const [students, edges, audit, raw] = await Promise.all([
  load('students.json'), load('sponsorships.json'), load('reconciliation-audit.json'), load('raw-pdf-sponsorships.json'),
]);
const fail = (message) => { throw new Error(message); };
const idSet = new Set(students.map((student) => student.id));
if (idSet.size !== students.length) fail(`Duplicate student IDs: ${students.length - idSet.size}`);

const normalized = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const canonicals = new Map();
for (const student of students) {
  const key = normalized(student.canonicalName);
  if (canonicals.has(key)) fail(`Duplicate canonical names: ${student.canonicalName} / ${canonicals.get(key)}`);
  canonicals.set(key, student.canonicalName);
  if (!student.id || !student.canonicalName || !student.displayName || !student.cohort || !Array.isArray(student.aliases) || typeof student.sigaaVerified !== 'boolean' || !['EXACT', 'TOKEN_SUBSET', 'FUZZY', 'PDF_ONLY'].includes(student.matchConfidence)) fail(`Invalid StudentNodeData: ${student.id}`);
}
for (const edge of edges) {
  if (!idSet.has(edge.godparentId) || !idSet.has(edge.godchildId)) fail(`Dangling edge ${edge.id}`);
  if (!['P2', 'VETERANO'].includes(edge.role) || !edge.semester || !edge.sourceDoc) fail(`Invalid SponsorshipEdgeData: ${edge.id}`);
}
for (const entry of audit) {
  if (!idSet.has(entry.resolvedStudentId) || !entry.rawName || !entry.sourceDoc || !entry.canonicalName || !entry.matchConfidence || !entry.explanation) fail(`Invalid audit record: ${entry.rawName}`);
}

// Kahn's algorithm also catches self-loops and cycles across all source semesters.
const indegree = new Map(students.map(({ id }) => [id, 0]));
const outgoing = new Map(students.map(({ id }) => [id, []]));
for (const { godparentId, godchildId } of edges) {
  outgoing.get(godparentId).push(godchildId);
  indegree.set(godchildId, indegree.get(godchildId) + 1);
}
const queue = [...indegree].filter(([, count]) => count === 0).map(([id]) => id);
let visited = 0;
while (queue.length) {
  const id = queue.pop(); visited++;
  for (const child of outgoing.get(id)) {
    indegree.set(child, indegree.get(child) - 1);
    if (indegree.get(child) === 0) queue.push(child);
  }
}
if (visited !== students.length) fail(`Graph contains a cycle (${students.length - visited} nodes remain)`);

const expectedBySemester = ['2025.1', '2025.2', '2026.1', '2026.2'].map((semester) => raw[`sponsorships_${semester.replace('.', '_')}`]?.length ?? 0);
if (expectedBySemester.some((count, index) => count !== [23, 25, 27, 19][index])) {
  fail(`Expected 23, 25, 27, and 19 pairings by semester; found ${expectedBySemester.join(', ')}`);
}
const expected = expectedBySemester.reduce((sum, count) => sum + count, 0);
if (expected !== 94) fail(`Expected 94 total pairings, found ${expected}`);
if (edges.length !== expected * 2) fail(`Expected ${expected * 2} edges, found ${edges.length}`);
const requiredPairs = [
  ['Adiel', 'Adiel Emilson'], ['Pedro Borraz Souto', 'Pedro Borrás Souto'],
  ['Mikael Rodrigues', 'Mikael Rodrigues dos Santos'], ['Igor Mendonça', 'Igor Mendonça de Souza'],
  ['Maria Rita', 'Maria Rita dos Santos Silva'], ['Elton de Assis', 'Elton de Assis Guedes Neto'],
  ['Cauã Lacerda', 'Cauã Henrique F. de Lacerda'], ['Matheus Nunes', 'Matheus da Silva Nunes'],
  ['Paulo Henrique Fernandes', 'Paulo Henrique Nunes Fernandes e Silva'], ['Maria Eloisa', 'Maria Eloísa'],
];
for (const [a, b] of requiredPairs) {
  const find = (rawName) => students.filter(({ canonicalName, aliases }) => normalized(canonicalName) === normalized(rawName) || aliases.some((alias) => normalized(alias.replace(/\s*\([^)]*\)/g, '')) === normalized(rawName)));
  const left = find(a), right = find(b);
  if (left.length !== 1 || right.length !== 1 || left[0].id !== right[0].id) fail(`Known alias did not resolve together: ${a} / ${b}`);
}
const sophia = students.find(({ aliases }) => aliases.some((alias) => normalized(alias) === normalized('sophia de carvalho beltrão')));
if (!sophia || sophia.canonicalName !== 'Sophia de Carvalho Beltrão') fail('Sophia name casing was not normalized');
const joaoHenrique = students.filter(({ aliases }) => aliases.some((alias) =>
  normalized(alias.replace(/\s*\([^)]*\)/g, '')) === normalized('João Henrique de Araújo Pereira')));
if (joaoHenrique.length !== 1 || joaoHenrique[0].cohort !== '2021.2') {
  fail('João Henrique de Araújo Pereira was not assigned to cohort 2021.2');
}

const expectedSigaaMatches = [
  ['20250019035', 'Davidys Cavalcante de Pontes'],
  ['20250019231', 'Lucas Aprigio Santos de Oliveira'],
  ['20240095365', 'Diego de Sousa Maciel'],
  ['20240011507', 'Nathan David Figueiredo Barros'],
  ['20240011300', 'Thiago Mateus Marques Ribeiro'],
  ['20240011427', 'Yosef Joseph Goncalves do Nascimento'],
  ['20250018619', 'Artur Amorim Barbosa'],
  ['20260011881', 'Sarah Ariel Bazante Alexandre'],
  ['20240011060', 'Ana Beatriz Mota da Cruz'],
  ['20250018637', 'Artur Rodrigues Nunes de Almeida'],
  ['20260011765', 'Helio Jose Barbosa Junior'],
];
for (const [matricula, name] of expectedSigaaMatches) {
  const matches = students.filter((student) => student.matricula === matricula);
  if (matches.length !== 1 || normalized(matches[0].canonicalName) !== normalized(name) || !matches[0].sigaaVerified) {
    fail(`Expected ${name} to resolve uniquely to SIGAA matrícula ${matricula}`);
  }
}

const source2026_2 = raw.sponsorships_2026_2_source;
const ferinhas2026_2 = raw.sponsorships_2026_2;
const matchedFerinhas = new Set();
for (const row of ferinhas2026_2) {
  const records = audit.filter((entry) => entry.sourceDoc === source2026_2 && entry.rawName === row.godchild);
  if (records.length !== 1) fail(`Expected one audit match for 2026.2 ferinha ${row.godchild}`);
  const student = students.find(({ id }) => id === records[0].resolvedStudentId);
  if (!student?.sigaaVerified || !student.matricula || student.cohort !== '2026.2') {
    fail(`2026.2 ferinha did not resolve to an active SIGAA student: ${row.godchild}`);
  }
  matchedFerinhas.add(student.id);
}
if (ferinhas2026_2.length !== 19 || matchedFerinhas.size !== 19) {
  fail(`Expected 19 unique SIGAA-matched 2026.2 ferinhas; found ${matchedFerinhas.size}`);
}

const pdfOnlyNames = [
  ['Luana Cazé', '2025.1'], ['Liliana', '2025.1'],
];
for (const [name, cohort] of pdfOnlyNames) {
  const matches = students.filter((student) => student.aliases.some((alias) =>
    normalized(alias.replace(/\s*\([^)]*\)/g, '')) === normalized(name)));
  if (matches.length !== 1 || matches[0].cohort !== cohort || matches[0].sigaaVerified || matches[0].matricula !== null) {
    fail(`Expected ${name} (${cohort}) to remain a single unresolved PDF-only student`);
  }
}
const biaMatches = students.filter((student) => student.aliases.some((alias) =>
  normalized(alias.replace(/\s*\([^)]*\)/g, '')) === normalized('Bia Barreto')));
if (biaMatches.length !== 1 || biaMatches[0].canonicalName !== 'Beatriz Barreto Cavalcanti' ||
    biaMatches[0].cohort !== '2022.1' || biaMatches[0].sigaaVerified || biaMatches[0].matricula !== null) {
  fail('Bia Barreto did not resolve to the confirmed 2022.1 PDF-only identity Beatriz Barreto Cavalcanti');
}
const samuelMatches = students.filter((student) => student.matricula === '20240011249');
if (samuelMatches.length !== 1 || samuelMatches[0].canonicalName !== 'Samuel Victor Fernandes Dantas Vicente') {
  fail('Samuel do Bem did not resolve to SIGAA matrícula 20240011249');
}
for (const alias of ['Samuel do Bem', 'Samuel Vicente']) {
  if (!samuelMatches[0].aliases.some((value) => normalized(value.replace(/\s*\([^)]*\)/g, '')) === normalized(alias))) {
    fail(`Confirmed Samuel alias missing: ${alias}`);
  }
}

console.log(`Validation passed: ${students.length} unique students, ${edges.length} edges (${expected} pairings × 2), ${audit.length} audit entries, 11 required SIGAA matches plus confirmed Samuel identity, 19 SIGAA-matched 2026.2 ferinhas, Beatriz Barreto Cavalcanti assigned to 2022.1, 2 unresolved PDF-only identities preserved, 100% edge integrity, acyclic graph.`);
