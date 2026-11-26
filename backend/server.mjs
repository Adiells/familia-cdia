import { randomUUID, timingSafeEqual } from 'node:crypto';
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
const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
const syncToken = (process.env.SYNC_TOKEN || '').trim();
const parsedSyncInterval = Number(process.env.BACKUP_SYNC_INTERVAL_MS);
const backupSyncIntervalMs =
  Number.isFinite(parsedSyncInterval) && parsedSyncInterval > 0 ? parsedSyncInterval : 21600000;
const supabaseTimeoutMs = 5000;
const rateLimitWindowMs = 60 * 60 * 1000;
const rateLimitMaxRequests = 20;
const semesterPattern = /^20\d{2}\.[12]$/;
const yearOnlyPattern = /^20\d{2}$/;
const maxBodyBytes = 1024 * 1024;
let writeQueue = Promise.resolve();
let lastBackupSyncAt = 0;
let backupSyncInFlight = false;
const postRateLimits = new Map();

function corsHeaders(request) {
  const requestOrigin = request.headers.origin;
  const origin = allowedOrigin === '*' ? '*' : allowedOrigin;
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (origin !== '*') headers.Vary = 'Origin';
  if (requestOrigin && allowedOrigin !== '*' && requestOrigin !== allowedOrigin) return { ...headers, 'x-cors-denied': 'true' };
  return headers;
}

function sendJson(request, response, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...corsHeaders(request),
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  response.end(body);
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0 && forwarded[0].trim()) {
    return forwarded[0].split(',')[0].trim();
  }
  return request.socket?.remoteAddress || 'unknown';
}

function checkPostRateLimit(request) {
  const now = Date.now();
  const ip = getClientIp(request);
  const cutoff = now - rateLimitWindowMs;

  if (postRateLimits.size > 1000) {
    for (const [key, timestamps] of postRateLimits.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) postRateLimits.delete(key);
      else postRateLimits.set(key, active);
    }
  }

  const timestamps = (postRateLimits.get(ip) || []).filter((ts) => ts > cutoff);
  if (timestamps.length >= rateLimitMaxRequests) {
    postRateLimits.set(ip, timestamps);
    const retryAfterSeconds = Math.max(1, Math.ceil((timestamps[0] + rateLimitWindowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  timestamps.push(now);
  postRateLimits.set(ip, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

function isAuthorizedSyncToken(headerValue) {
  if (!syncToken || typeof headerValue !== 'string') return false;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const provided = Buffer.from(match[1].trim(), 'utf8');
  const expected = Buffer.from(syncToken, 'utf8');
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
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

function buildSupabaseHeaders(extra = {}) {
  const headers = {
    apikey: supabaseKey,
    Accept: 'application/json',
    ...extra,
  };
  // New Supabase secret keys (sb_secret_...) are opaque strings and must only
  // be sent in the apikey header; legacy service_role JWTs also need Bearer.
  if (!supabaseKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${supabaseKey}`;
  }
  return headers;
}

function fromStudentRow(row) {
  const student = {
    id: row.id,
    canonicalName: row.canonical_name,
    displayName: row.display_name,
    matricula: row.matricula ?? null,
    cohort: row.cohort,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    sigaaVerified: Boolean(row.sigaa_verified),
    matchConfidence: row.match_confidence || 'PDF_ONLY',
  };
  if (typeof row.notes === 'string' && row.notes.trim()) {
    student.notes = row.notes;
  }
  return student;
}

function fromSponsorshipRow(row) {
  return {
    id: row.id,
    godparentId: row.godparent_id,
    godchildId: row.godchild_id,
    semester: row.semester,
    sourceDoc: row.source_doc || 'user-added',
  };
}

async function fetchSupabaseTable(table, selectColumns) {
  const pageSize = 1000;
  const rows = [];
  const deadline = Date.now() + supabaseTimeoutMs;

  for (let offset = 0; ; offset += pageSize) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(`Supabase request timed out while reading ${table}.`);
    }
    const url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(selectColumns)}&order=created_at.asc,id.asc&limit=${pageSize}&offset=${offset}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: buildSupabaseHeaders(),
      signal: AbortSignal.timeout(remainingMs),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Supabase GET ${table} failed (${response.status}): ${details.slice(0, 200)}`);
    }
    const page = await response.json();
    if (!Array.isArray(page)) {
      throw new Error(`Supabase GET ${table} returned a non-array response.`);
    }
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function fetchGraphFromSupabase() {
  const [studentRows, sponsorshipRows] = await Promise.all([
    fetchSupabaseTable(
      'students',
      'id,canonical_name,display_name,matricula,cohort,aliases,sigaa_verified,match_confidence,notes,created_at',
    ),
    fetchSupabaseTable(
      'sponsorships',
      'id,godparent_id,godchild_id,semester,source_doc,created_at',
    ),
  ]);
  return {
    students: studentRows.map(fromStudentRow),
    sponsorships: sponsorshipRows.map(fromSponsorshipRow),
  };
}

async function insertSponsorshipRequest({ requestType, summary, payload }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/sponsorship_requests`, {
    method: 'POST',
    headers: buildSupabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify({
      request_type: requestType,
      summary,
      payload,
      status: 'pending',
    }),
    signal: AbortSignal.timeout(supabaseTimeoutMs),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Supabase INSERT sponsorship_requests failed (${response.status}): ${details.slice(0, 200)}`);
  }
  const inserted = await response.json();
  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  return row?.id ?? null;
}

function maybeTriggerBackgroundBackupSync(students, sponsorships) {
  if (!isSupabaseConfigured || students.length === 0 || backupSyncInFlight) return;
  if (Date.now() - lastBackupSyncAt < backupSyncIntervalMs) return;

  backupSyncInFlight = true;
  withWriteQueue(async () => {
    await persistData(students, sponsorships);
    lastBackupSyncAt = Date.now();
  })
    .catch((error) => {
      console.warn('Background backup sync to DATA_DIR failed:', error);
    })
    .finally(() => {
      backupSyncInFlight = false;
    });
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
  const originals = await Promise.all(files.map(({ path: filePath }) => readFile(filePath).catch(() => null)));
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
      if (originals[index] !== null) {
        const restorePath = `${files[index].path}.${randomUUID()}.restore`;
        await writeFile(restorePath, originals[index]);
        await rename(restorePath, files[index].path);
      }
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

function buildRequestSummary(resolvedTrios, resolvedStandalone) {
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
    let current;
    if (isSupabaseConfigured) {
      try {
        current = await fetchGraphFromSupabase();
      } catch (error) {
        console.warn('Supabase read failed before moderation submission, falling back to local data for validation:', error);
        current = await readCurrentData();
      }
    } else {
      current = await readCurrentData();
    }

    const sigaaRecords = await readJson(sigaaPath);
    if (!Array.isArray(sigaaRecords)) throw new Error('SIGAA data file must contain a JSON array.');
    const officialByRegistration = new Map(sigaaRecords.map((record) => [record.matricula, record]));
    const students = current.students.map((student) => ({ ...student }));
    const sponsorships = [...current.sponsorships];
    const studentById = new Map(students.map((student) => [student.id, student]));
    const studentByRegistration = new Map(students.filter((student) => student.matricula).map((student) => [student.matricula, student]));
    const studentByOfficialName = new Map(students.map((student) => [normalizeName(student.canonicalName), student]));
    const addedStudentIds = new Set();
    const touchedStudentsById = new Map();
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
        touchedStudentsById.set(student.id, student);
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
      touchedStudentsById.set(student.id, student);
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

    const resolvedStandalone = [];
    for (const standaloneParticipant of parsedStandalone) {
      const resolution = resolveParticipant(standaloneParticipant, null);
      if (resolution.error) return { status: resolution.errorStatus, body: { error: resolution.error } };
      resolvedStandalone.push(resolution.student);
    }

    const newEdges = [];
    const edgeKeys = new Set(sponsorships.map((edge) => `${edge.godparentId}|${edge.godchildId}|${edge.semester}`));
    for (const item of resolvedTrios) {
      for (const godparent of item.godparents) {
        const edgeKey = `${godparent.id}|${item.child.id}|${item.semester}`;
        if (!edgeKeys.has(edgeKey)) {
          const edge = {
            id: `${item.semester}-${safeSlug(godparent.id)}-${safeSlug(item.child.id)}-${randomUUID().slice(0, 8)}`,
            godparentId: godparent.id,
            godchildId: item.child.id,
            semester: item.semester,
            sourceDoc: 'user-added',
          };
          sponsorships.push(edge);
          newEdges.push(edge);
          edgeKeys.add(edgeKey);
        }
      }
    }

    if (isSupabaseConfigured) {
      const requestType = resolvedTrios.length > 0 ? 'sponsorship' : 'standalone';
      const summary = buildRequestSummary(resolvedTrios, resolvedStandalone);
      const requestPayload = {
        students: Array.from(touchedStudentsById.values()),
        sponsorships: newEdges,
      };
      const requestId = await insertSponsorshipRequest({
        requestType,
        summary,
        payload: requestPayload,
      });
      return {
        status: 202,
        body: {
          pending: true,
          requestId,
          message: 'Solicitação enviada para aprovação dos mantenedores.',
          students: current.students,
          sponsorships: current.sponsorships,
        },
      };
    }

    if (studentRecordsChanged || sponsorships.length !== current.sponsorships.length) {
      await persistData(students, sponsorships);
    }
    return {
      status: 200,
      body: {
        students,
        sponsorships,
        addedStudents: addedStudentIds.size,
        addedSponsorships: newEdges.length,
      },
    };
  });
}

async function handleGetSponsorships(request, response) {
  if (isSupabaseConfigured) {
    try {
      const { students, sponsorships } = await fetchGraphFromSupabase();
      maybeTriggerBackgroundBackupSync(students, sponsorships);
      sendJson(request, response, 200, {
        students,
        sponsorships,
        source: 'supabase',
        moderationEnabled: true,
      });
      return;
    } catch (error) {
      console.warn('Supabase GET /api/sponsorships failed; falling back to DATA_DIR:', error);
      try {
        const fallback = await readCurrentData();
        sendJson(request, response, 200, {
          ...fallback,
          source: 'bucket-fallback',
          moderationEnabled: true,
        });
        return;
      } catch (fallbackError) {
        console.error('Fallback readCurrentData also failed:', fallbackError);
        sendJson(request, response, 500, { error: 'Não foi possível ler os dados de apadrinhamento.' });
        return;
      }
    }
  }

  try {
    sendJson(request, response, 200, await readCurrentData());
  } catch (error) {
    console.error('Unable to read sponsorship data:', error);
    sendJson(request, response, 500, { error: 'Não foi possível ler os dados de apadrinhamento.' });
  }
}

async function handleSyncBackup(request, response) {
  if (!isSupabaseConfigured || !syncToken) {
    sendJson(request, response, 503, {
      error: 'Sincronização de backup indisponível: configure SUPABASE_URL, SUPABASE_SECRET_KEY e SYNC_TOKEN.',
    });
    return;
  }
  if (!isAuthorizedSyncToken(request.headers.authorization)) {
    sendJson(request, response, 401, { error: 'Não autorizado.' });
    return;
  }
  try {
    const { students, sponsorships } = await fetchGraphFromSupabase();
    if (students.length === 0) {
      sendJson(request, response, 502, {
        error: 'Supabase retornou 0 estudantes; backup em disco preservado sem sobrescrita.',
      });
      return;
    }
    await withWriteQueue(async () => {
      await persistData(students, sponsorships);
      lastBackupSyncAt = Date.now();
    });
    sendJson(request, response, 200, {
      synced: true,
      students: students.length,
      sponsorships: sponsorships.length,
      syncedAt: new Date(lastBackupSyncAt).toISOString(),
    });
  } catch (error) {
    console.error('Unable to sync backup from Supabase:', error);
    sendJson(request, response, 502, { error: 'Não foi possível sincronizar o backup do Supabase.' });
  }
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
    await handleGetSponsorships(request, response);
    return;
  }
  if (request.method === 'POST' && pathname === '/api/sponsorships') {
    const rate = checkPostRateLimit(request);
    if (!rate.allowed) {
      sendJson(
        request,
        response,
        429,
        { error: 'Limite de solicitações atingido. Tente novamente mais tarde.' },
        { 'Retry-After': String(rate.retryAfterSeconds) },
      );
      return;
    }
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
  if (request.method === 'POST' && pathname === '/api/sync-backup') {
    await handleSyncBackup(request, response);
    return;
  }
  if (pathname === '/api/sync-backup') {
    response.setHeader('Allow', 'POST, OPTIONS');
    sendJson(request, response, 405, { error: 'Método não permitido.' });
    return;
  }
  sendJson(request, response, 404, { error: 'Rota não encontrada.' });
});

server.listen(port, '0.0.0.0', () => {
  const mode = isSupabaseConfigured ? 'supabase + moderation (fallback DATA_DIR)' : 'local/bucket DATA_DIR';
  console.log(`Familia CDIA API listening on 0.0.0.0:${port}; mode: ${mode}; data directory: ${dataDirectory}`);
});
