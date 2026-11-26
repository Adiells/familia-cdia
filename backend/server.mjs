import { randomUUID, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { createRateLimiter } from './rate-limit.mjs';
import { dataDirectory, persistData, readCurrentData, readSigaaRecords, withWriteQueue } from './storage.mjs';
import { fetchSupabaseData, insertSponsorshipRequest, isSupabaseConfigured } from './supabase.mjs';
import { buildRequestSummary, normalizeName, parseParticipant, parseTrio, safeSlug } from './validation.mjs';

const port = Number(process.env.PORT || 8080);
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
const syncToken = (process.env.SYNC_TOKEN || '').trim();
const parsedSyncInterval = Number(process.env.BACKUP_SYNC_INTERVAL_MS);
const backupSyncIntervalMs =
  Number.isFinite(parsedSyncInterval) && parsedSyncInterval > 0 ? parsedSyncInterval : 21600000;
const maxBodyBytes = 1024 * 1024;
const checkPostRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 20 });

let lastBackupSyncAt = 0;
let backupSyncInFlight = false;

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
  if (requestOrigin && allowedOrigin !== '*' && requestOrigin !== allowedOrigin) {
    return { ...headers, 'x-cors-denied': 'true' };
  }
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

function isAuthorizedSyncToken(headerValue) {
  if (!syncToken || typeof headerValue !== 'string') return false;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const provided = Buffer.from(match[1].trim(), 'utf8');
  const expected = Buffer.from(syncToken, 'utf8');
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
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
        current = await fetchSupabaseData();
      } catch (error) {
        console.warn('Supabase read failed before moderation submission, falling back to local data for validation:', error);
        current = await readCurrentData();
      }
    } else {
      current = await readCurrentData();
    }

    const sigaaRecords = await readSigaaRecords();
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
      const requestId = await insertSponsorshipRequest({
        requestType,
        summary,
        payload: {
          students: Array.from(touchedStudentsById.values()),
          sponsorships: newEdges,
        },
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
      const { students, sponsorships } = await fetchSupabaseData();
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
    const { students, sponsorships } = await fetchSupabaseData();
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
