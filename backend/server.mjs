import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(here, '../src/data'));
const studentsPath = path.join(dataDirectory, 'students.json');
const sponsorshipsPath = path.join(dataDirectory, 'sponsorships.json');
const sigaaPath = path.join(dataDirectory, 'sigaa-students.json');
const port = Number(process.env.PORT || 8080);
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
const semesterPattern = /^20\d{2}\.[12]$/;
const maxBodyBytes = 1024 * 1024;
let writeQueue = Promise.resolve();

function corsHeaders(request) {
  const requestOrigin = request.headers.origin;
  const origin = allowedOrigin === '*' ? '*' : allowedOrigin;
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin !== '*') headers.Vary = 'Origin';
  if (requestOrigin && allowedOrigin !== '*' && requestOrigin !== allowedOrigin) return { ...headers, 'x-cors-denied': 'true' };
  return headers;
}

function sendJson(request, response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...corsHeaders(request),
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readCurrentData() {
  const [students, sponsorships] = await Promise.all([
    readJson(studentsPath),
    readJson(sponsorshipsPath),
  ]);
  if (!Array.isArray(students) || !Array.isArray(sponsorships)) {
    throw new Error('Student and sponsorship data files must contain JSON arrays.');
  }
  return { students, sponsorships };
}

function normalizeName(value) {
  return value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function safeSlug(value) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function withWriteQueue(work) {
  const result = writeQueue.then(work, work);
  writeQueue = result.catch(() => undefined);
  return result;
}

async function persistData(students, sponsorships) {
  await mkdir(dataDirectory, { recursive: true });
  const files = [
    { path: studentsPath, content: `${JSON.stringify(students, null, 2)}\n` },
    { path: sponsorshipsPath, content: `${JSON.stringify(sponsorships, null, 2)}\n` },
  ];
  const originals = await Promise.all(files.map(({ path: filePath }) => readFile(filePath)));
  const tempPaths = files.map(({ path: filePath }) => `${filePath}.${randomUUID()}.tmp`);
  let committed = 0;
  try {
    await Promise.all(files.map(({ content }, index) => writeFile(tempPaths[index], content, { encoding: 'utf8', flag: 'wx' })));
    for (let index = 0; index < files.length; index += 1) {
      await rename(tempPaths[index], files[index].path);
      committed += 1;
    }
  } catch (error) {
    await Promise.all(tempPaths.map((tempPath) => unlink(tempPath).catch(() => undefined)));
    for (let index = 0; index < committed; index += 1) {
      const restorePath = `${files[index].path}.${randomUUID()}.restore`;
      await writeFile(restorePath, originals[index]);
      await rename(restorePath, files[index].path);
    }
    throw error;
  }
}

async function readBody(request, response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      sendJson(request, response, 413, { error: 'Corpo da solicitação excede o limite de 1 MB.' });
      return null;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    sendJson(request, response, 400, { error: 'Corpo JSON inválido.' });
    return null;
  }
}

function parseTrio(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Apadrinhamento inválido.' };
  const childRegistration = raw.calouroMatricula;
  const semester = raw.semester;
  let godparentRegistrations;
  if (Array.isArray(raw.godparentMatriculas)) {
    if (raw.godparentMatriculas.length < 1 || raw.godparentMatriculas.length > 50 || raw.godparentMatriculas.some((value) => typeof value !== 'string' || !value.trim())) {
      return { error: 'Informe de 1 a 50 matrículas de padrinhos/madrinhas.' };
    }
    godparentRegistrations = raw.godparentMatriculas.map((value) => value.trim());
  } else {
    // Backward-compatible input: P2 is required; the second (veterano) is optional.
    if (typeof raw.p2Matricula !== 'string' || !raw.p2Matricula.trim()) {
      return { error: 'Informe ao menos uma matrícula de padrinho/madrinha.' };
    }
    if (raw.veteranoMatricula !== undefined && raw.veteranoMatricula !== null && typeof raw.veteranoMatricula !== 'string') {
      return { error: 'Matrícula de padrinho/madrinha inválida.' };
    }
    godparentRegistrations = [
      raw.p2Matricula.trim(),
      ...(typeof raw.veteranoMatricula === 'string' && raw.veteranoMatricula.trim() ? [raw.veteranoMatricula.trim()] : []),
    ];
  }
  if (typeof childRegistration !== 'string' || !childRegistration.trim()) return { error: 'Matrícula do(a) calouro(a) obrigatória.' };
  if (typeof semester !== 'string' || !semesterPattern.test(semester.trim())) return { error: 'Semestre inválido. Use o formato AAAA.1 ou AAAA.2.' };
  const cleanChildRegistration = childRegistration.trim();
  if (new Set([cleanChildRegistration, ...godparentRegistrations]).size !== godparentRegistrations.length + 1) {
    return { error: 'Calouro(a) e padrinhos/madrinhas precisam ser pessoas distintas.' };
  }
  return { value: { calouroMatricula: cleanChildRegistration, godparentMatriculas: godparentRegistrations, semester: semester.trim() } };
}

async function createSponsorships(rawTrios) {
  if (!Array.isArray(rawTrios) || rawTrios.length < 1 || rawTrios.length > 200) {
    return { status: 400, body: { error: 'Envie entre 1 e 200 apadrinhamentos.' } };
  }
  const parsed = [];
  for (const raw of rawTrios) {
    const result = parseTrio(raw);
    if (result.error) return { status: 400, body: { error: result.error } };
    parsed.push(result.value);
  }

  return withWriteQueue(async () => {
    const [current, sigaaRecords] = await Promise.all([
      readCurrentData(),
      readJson(sigaaPath),
    ]);
    if (!Array.isArray(sigaaRecords)) throw new Error('SIGAA data file must contain a JSON array.');
    const officialByRegistration = new Map(sigaaRecords.map((record) => [record.matricula, record]));
    const students = [...current.students];
    const sponsorships = [...current.sponsorships];
    const studentByRegistration = new Map(students.filter((student) => student.matricula).map((student) => [student.matricula, student]));
    const studentByOfficialName = new Map(students.map((student) => [normalizeName(student.canonicalName), student]));
    const resolvedByRegistration = new Map();
    const addedStudentIds = new Set();
    let studentRecordsChanged = false;

    for (const item of parsed) {
      for (const registration of [item.calouroMatricula, ...item.godparentMatriculas]) {
        const official = officialByRegistration.get(registration);
        if (!official) return { status: 422, body: { error: `Matrícula ${registration} não está no cadastro ativo do SIGAA.` } };
        let student = studentByRegistration.get(registration) ?? studentByOfficialName.get(normalizeName(official.name));
        if (student?.matricula && student.matricula !== registration) {
          return { status: 409, body: { error: `Nome SIGAA ambíguo para matrícula ${registration}.` } };
        }
        if (!student) {
          const isCalouro = registration === item.calouroMatricula;
          student = {
            id: `sigaa-${registration}`,
            canonicalName: official.name,
            displayName: official.name,
            matricula: registration,
            cohort: isCalouro ? item.semester : `${official.inferredCohort ?? registration.slice(0, 4)}.1`,
            aliases: [],
            sigaaVerified: true,
            matchConfidence: 'EXACT',
          };
          const idCollision = students.find((known) => known.id === student.id && known.matricula !== registration);
          if (idCollision) return { status: 409, body: { error: `Identificador de estudante duplicado para matrícula ${registration}.` } };
          students.push(student);
          studentByRegistration.set(registration, student);
          studentByOfficialName.set(normalizeName(official.name), student);
          addedStudentIds.add(registration);
          studentRecordsChanged = true;
        } else if (!student.matricula || !student.sigaaVerified) {
          // Promote an existing PDF node when its official SIGAA name resolves exactly.
          student.matricula = registration;
          student.sigaaVerified = true;
          student.matchConfidence = 'EXACT';
          studentByRegistration.set(registration, student);
          studentRecordsChanged = true;
        }
        resolvedByRegistration.set(registration, student);
      }
    }

    let addedSponsorships = 0;
    const edgeKeys = new Set(sponsorships.map((edge) => `${edge.godparentId}|${edge.godchildId}|${edge.role}|${edge.semester}`));
    for (const item of parsed) {
      const child = resolvedByRegistration.get(item.calouroMatricula);
      for (const [index, registration] of item.godparentMatriculas.entries()) {
        const godparent = resolvedByRegistration.get(registration);
        // The shared graph contract distinguishes P2 and VETERANO. Preserve the first
        // selected parent as P2 and represent any additional parents as VETERANO links.
        const edge = { godparentId: godparent.id, godchildId: child.id, role: index === 0 ? 'P2' : 'VETERANO' };
        const edgeKey = `${edge.godparentId}|${edge.godchildId}|${edge.role}|${item.semester}`;
        if (!edgeKeys.has(edgeKey)) {
          sponsorships.push({ ...edge, id: `${item.semester}-${edge.role.toLowerCase()}-${safeSlug(edge.godparentId)}-${safeSlug(edge.godchildId)}-${randomUUID().slice(0, 8)}`, semester: item.semester, sourceDoc: 'user-added' });
          edgeKeys.add(edgeKey);
          addedSponsorships += 1;
        }
      }
    }

    if (studentRecordsChanged || sponsorships.length !== current.sponsorships.length) await persistData(students, sponsorships);
    return { status: 200, body: { students, sponsorships, addedStudents: addedStudentIds.size, addedSponsorships } };
  });
}

const server = http.createServer(async (request, response) => {
  const cors = corsHeaders(request);
  if (cors['x-cors-denied']) {
    sendJson(request, response, 403, { error: 'Origem não autorizada.' });
    return;
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors);
    response.end();
    return;
  }
  const pathname = new URL(request.url || '/', 'http://localhost').pathname.replace(/\/$/, '') || '/';
  if (request.method === 'GET' && pathname === '/health') {
    sendJson(request, response, 200, { status: 'ok' });
    return;
  }
  if (request.method === 'GET' && pathname === '/api/sponsorships') {
    try {
      sendJson(request, response, 200, await readCurrentData());
    } catch (error) {
      console.error('Unable to read sponsorship data:', error);
      sendJson(request, response, 500, { error: 'Não foi possível ler os dados de apadrinhamento.' });
    }
    return;
  }
  if (request.method === 'POST' && pathname === '/api/sponsorships') {
    const payload = await readBody(request, response);
    if (payload === null) return;
    try {
      const result = await createSponsorships(payload?.trios);
      sendJson(request, response, result.status, result.body);
    } catch (error) {
      console.error('Unable to process sponsorship request:', error);
      sendJson(request, response, 500, { error: 'Não foi possível salvar os dados de apadrinhamento.' });
    }
    return;
  }
  if (pathname === '/api/sponsorships') {
    response.setHeader('Allow', 'GET, POST, OPTIONS');
    sendJson(request, response, 405, { error: 'Método não permitido.' });
    return;
  }
  sendJson(request, response, 404, { error: 'Rota não encontrada.' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Familia CDIA API listening on 0.0.0.0:${port}; data directory: ${dataDirectory}`);
});
