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
const yearOnlyPattern = /^20\d{2}$/;
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

function normalizeCohort(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (semesterPattern.test(trimmed)) return trimmed;
  if (yearOnlyPattern.test(trimmed)) return `${trimmed}.1`;
  return null;
}

function parseParticipant(raw, label) {
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
      return { error: `Período ou ano de ingresso inválido para ${label}. Use AAAA.1, AAAA.2 ou AAAA (ex.: 2020.1 ou 2020).` };
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

function parseTrio(raw) {
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

async function createSponsorships(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 400, body: { error: 'Corpo da solicitação inválido.' } };
  }
  const rawTrios = payload.trios === undefined ? [] : payload.trios;
  const rawStandalone = payload.standaloneStudents === undefined ? [] : payload.standaloneStudents;
  if (!Array.isArray(rawTrios) || !Array.isArray(rawStandalone)) {
    return { status: 400, body: { error: 'Campos trios e standaloneStudents devem ser listas.' } };
  }
  if (rawTrios.length > 200) {
    return { status: 400, body: { error: 'Envie no máximo 200 apadrinhamentos por vez.' } };
  }
  if (rawStandalone.length > 50) {
    return { status: 400, body: { error: 'Envie no máximo 50 estudantes avulsos por vez.' } };
  }
  if (rawTrios.length + rawStandalone.length < 1) {
    return { status: 400, body: { error: 'Envie ao menos 1 apadrinhamento ou 1 estudante.' } };
  }

  const parsedTrios = [];
  for (const raw of rawTrios) {
    const result = parseTrio(raw);
    if (result.error) return { status: 400, body: { error: result.error } };
    parsedTrios.push(result.value);
  }

  const parsedStandalone = [];
  for (const raw of rawStandalone) {
    const result = parseParticipant(raw, 'o(a) estudante');
    if (result.error) return { status: 400, body: { error: result.error } };
    parsedStandalone.push(result.value);
  }

  return withWriteQueue(async () => {
    const [current, sigaaRecords] = await Promise.all([
      readCurrentData(),
      readJson(sigaaPath),
    ]);
    if (!Array.isArray(sigaaRecords)) throw new Error('SIGAA data file must contain a JSON array.');
    const officialByRegistration = new Map(sigaaRecords.map((record) => [record.matricula, record]));
    const students = current.students.map((student) => ({ ...student }));
    const sponsorships = [...current.sponsorships];
    const studentById = new Map(students.map((student) => [student.id, student]));
    const studentByRegistration = new Map(students.filter((student) => student.matricula).map((student) => [student.matricula, student]));
    const studentByOfficialName = new Map(students.map((student) => [normalizeName(student.canonicalName), student]));
    const addedStudentIds = new Set();
    let studentRecordsChanged = false;

    const makeUniqueExternalId = (name) => {
      const baseSlug = safeSlug(name) || `student-${randomUUID().slice(0, 8)}`;
      let candidate = baseSlug;
      let suffix = 2;
      while (studentById.has(candidate)) {
        candidate = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
      return candidate;
    };

    const resolveParticipant = (participant, fallbackCohort) => {
      if (participant.kind === 'sigaa') {
        const registration = participant.matricula;
        const official = officialByRegistration.get(registration);
        if (!official) {
          return { errorStatus: 422, error: `Matrícula ${registration} não está no cadastro ativo do SIGAA.` };
        }
        let student = studentByRegistration.get(registration) ?? studentByOfficialName.get(normalizeName(official.name));
        if (student?.matricula && student.matricula !== registration) {
          return { errorStatus: 409, error: `Nome SIGAA ambíguo para matrícula ${registration}.` };
        }
        if (!student) {
          const id = `sigaa-${registration}`;
          const idCollision = studentById.get(id);
          if (idCollision && idCollision.matricula !== registration) {
            return { errorStatus: 409, error: `Identificador de estudante duplicado para matrícula ${registration}.` };
          }
          student = {
            id,
            canonicalName: official.name,
            displayName: official.name,
            matricula: registration,
            cohort: fallbackCohort ?? `${official.inferredCohort ?? registration.slice(0, 4)}.1`,
            aliases: [],
            sigaaVerified: true,
            matchConfidence: 'EXACT',
          };
          students.push(student);
          studentById.set(student.id, student);
          studentByRegistration.set(registration, student);
          studentByOfficialName.set(normalizeName(official.name), student);
          addedStudentIds.add(student.id);
          studentRecordsChanged = true;
        } else if (!student.matricula || !student.sigaaVerified) {
          // Promote an existing PDF/external node when its official SIGAA name resolves exactly.
          student.matricula = registration;
          student.sigaaVerified = true;
          student.matchConfidence = 'EXACT';
          studentByRegistration.set(registration, student);
          studentRecordsChanged = true;
        }
        return { student };
      }

      let student = studentByOfficialName.get(participant.normalizedName);
      if (!student) {
        const id = makeUniqueExternalId(participant.name);
        student = {
          id,
          canonicalName: participant.name,
          displayName: participant.name,
          matricula: null,
          cohort: participant.cohort,
          aliases: [],
          sigaaVerified: false,
          matchConfidence: 'PDF_ONLY',
        };
        students.push(student);
        studentById.set(student.id, student);
        studentByOfficialName.set(participant.normalizedName, student);
        addedStudentIds.add(student.id);
        studentRecordsChanged = true;
      }
      return { student };
    };

    const resolvedTrios = [];
    for (const item of parsedTrios) {
      const childResolution = resolveParticipant(item.calouro, item.semester);
      if (childResolution.error) return { status: childResolution.errorStatus, body: { error: childResolution.error } };
      const godparents = [];
      for (const godparentParticipant of item.godparents) {
        const gpResolution = resolveParticipant(godparentParticipant, null);
        if (gpResolution.error) return { status: gpResolution.errorStatus, body: { error: gpResolution.error } };
        godparents.push(gpResolution.student);
      }
      const resolvedIds = [childResolution.student.id, ...godparents.map((student) => student.id)];
      if (new Set(resolvedIds).size !== resolvedIds.length) {
        return { status: 400, body: { error: 'Afilhado(a) e padrinhos/madrinhas precisam ser pessoas distintas.' } };
      }
      resolvedTrios.push({ child: childResolution.student, godparents, semester: item.semester });
    }

    for (const standaloneParticipant of parsedStandalone) {
      const resolution = resolveParticipant(standaloneParticipant, null);
      if (resolution.error) return { status: resolution.errorStatus, body: { error: resolution.error } };
    }

    let addedSponsorships = 0;
    const edgeKeys = new Set(sponsorships.map((edge) => `${edge.godparentId}|${edge.godchildId}|${edge.semester}`));
    for (const item of resolvedTrios) {
      for (const godparent of item.godparents) {
        const edgeKey = `${godparent.id}|${item.child.id}|${item.semester}`;
        if (!edgeKeys.has(edgeKey)) {
          sponsorships.push({
            id: `${item.semester}-${safeSlug(godparent.id)}-${safeSlug(item.child.id)}-${randomUUID().slice(0, 8)}`,
            godparentId: godparent.id,
            godchildId: item.child.id,
            semester: item.semester,
            sourceDoc: 'user-added',
          });
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
      const result = await createSponsorships(payload);
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
