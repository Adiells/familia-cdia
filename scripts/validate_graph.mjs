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

const expected = raw.sponsorships_2025_2.length + raw.sponsorships_2026_1.length;
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

console.log(`Validation passed: ${students.length} unique students, ${edges.length} edges (${expected} pairings × 2), ${audit.length} audit entries, 100% edge integrity, acyclic graph.`);
