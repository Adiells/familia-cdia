#!/usr/bin/env node
/**
 * Zero-dependency migration script to load Familia CDIA students and
 * sponsorships into Supabase via PostgREST batch upserts (Node 22+).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/migrate_to_supabase.mjs
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/migrate_to_supabase.mjs --from-api https://...
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/migrate_to_supabase.mjs --from-dir src/data
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_API_URL = 'https://familia-cdia-api-el3dwgsjma-uc.a.run.app/api/sponsorships';
const DEFAULT_BATCH_SIZE = 200;

function printHelp() {
  console.log(`Usage: node scripts/migrate_to_supabase.mjs [options]

Options:
  --from-api <url>     Fetch { students, sponsorships } from an API endpoint
                       (default: ${DEFAULT_API_URL})
  --from-dir <dir>     Read students.json and sponsorships.json from a local directory
  --batch-size <n>     Number of rows per PostgREST upsert batch (default: ${DEFAULT_BATCH_SIZE})
  --dry-run            Load and validate data without writing to Supabase
  -h, --help           Show this help message

Environment:
  SUPABASE_URL         Supabase project URL (e.g., https://<ref>.supabase.co)
  SUPABASE_SECRET_KEY  Supabase secret API key (or legacy SUPABASE_SERVICE_ROLE_KEY)`);
}

function parseArgs(argv) {
  let fromApi = null;
  let fromDir = null;
  let batchSize = DEFAULT_BATCH_SIZE;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--from-api') {
      fromApi = argv[++index];
      if (!fromApi) throw new Error('Missing value for --from-api');
      continue;
    }
    if (arg.startsWith('--from-api=')) {
      fromApi = arg.slice('--from-api='.length);
      if (!fromApi) throw new Error('Missing value for --from-api');
      continue;
    }
    if (arg === '--from-dir') {
      fromDir = argv[++index];
      if (!fromDir) throw new Error('Missing value for --from-dir');
      continue;
    }
    if (arg.startsWith('--from-dir=')) {
      fromDir = arg.slice('--from-dir='.length);
      if (!fromDir) throw new Error('Missing value for --from-dir');
      continue;
    }
    if (arg === '--batch-size') {
      batchSize = Number(argv[++index]);
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      batchSize = Number(arg.slice('--batch-size='.length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (fromApi && fromDir) {
    throw new Error('Specify either --from-api or --from-dir, not both.');
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    throw new Error('--batch-size must be an integer between 1 and 1000.');
  }

  return {
    sourceType: fromDir ? 'dir' : 'api',
    sourceTarget: fromDir ? path.resolve(fromDir) : (fromApi || DEFAULT_API_URL),
    batchSize,
    dryRun,
  };
}

async function loadFromApi(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to fetch source API (${response.status} ${response.statusText}): ${body}`);
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.students) || !Array.isArray(data.sponsorships)) {
    throw new Error('Source API response must contain "students" and "sponsorships" arrays.');
  }
  return { students: data.students, sponsorships: data.sponsorships };
}

async function loadFromDir(dirPath) {
  const [studentsRaw, sponsorshipsRaw] = await Promise.all([
    readFile(path.join(dirPath, 'students.json'), 'utf8'),
    readFile(path.join(dirPath, 'sponsorships.json'), 'utf8'),
  ]);
  const students = JSON.parse(studentsRaw);
  const sponsorships = JSON.parse(sponsorshipsRaw);
  if (!Array.isArray(students) || !Array.isArray(sponsorships)) {
    throw new Error('students.json and sponsorships.json must contain JSON arrays.');
  }
  return { students, sponsorships };
}

function toStudentRow(raw) {
  const id = String(raw.id ?? '').trim();
  const canonicalName = String(raw.canonicalName ?? raw.canonical_name ?? '').trim();
  const displayName = String(raw.displayName ?? raw.display_name ?? canonicalName).trim();
  const cohort = String(raw.cohort ?? '').trim();

  if (!id || !canonicalName || !displayName || !cohort) {
    throw new Error(`Invalid student record missing required fields: ${JSON.stringify(raw)}`);
  }

  const matricula =
    typeof raw.matricula === 'string' && raw.matricula.trim().length > 0
      ? raw.matricula.trim()
      : null;

  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];

  const notes =
    typeof raw.notes === 'string' && raw.notes.trim().length > 0
      ? raw.notes.trim()
      : null;

  const matchConfidence = String(raw.matchConfidence ?? raw.match_confidence ?? 'PDF_ONLY').trim() || 'PDF_ONLY';

  return {
    id,
    canonical_name: canonicalName,
    display_name: displayName,
    matricula,
    cohort,
    aliases,
    sigaa_verified: Boolean(raw.sigaaVerified ?? raw.sigaa_verified ?? false),
    match_confidence: matchConfidence,
    notes,
  };
}

function toSponsorshipRow(raw) {
  const id = String(raw.id ?? '').trim();
  const godparentId = String(raw.godparentId ?? raw.godparent_id ?? '').trim();
  const godchildId = String(raw.godchildId ?? raw.godchild_id ?? '').trim();
  const semester = String(raw.semester ?? '').trim();
  const sourceDoc = String(raw.sourceDoc ?? raw.source_doc ?? 'user-added').trim() || 'user-added';

  if (!id || !godparentId || !godchildId || !semester) {
    throw new Error(`Invalid sponsorship record missing required fields: ${JSON.stringify(raw)}`);
  }

  return {
    id,
    godparent_id: godparentId,
    godchild_id: godchildId,
    semester,
    source_doc: sourceDoc,
  };
}

function prepareRows(rawStudents, rawSponsorships) {
  const studentsById = new Map();
  const seenMatriculas = new Map();

  for (const raw of rawStudents) {
    const row = toStudentRow(raw);
    if (row.matricula) {
      const existingId = seenMatriculas.get(row.matricula);
      if (existingId && existingId !== row.id) {
        throw new Error(`Duplicate matricula "${row.matricula}" for students "${existingId}" and "${row.id}".`);
      }
      seenMatriculas.set(row.matricula, row.id);
    }
    studentsById.set(row.id, row);
  }

  const sponsorshipsById = new Map();
  const seenTriples = new Set();

  for (const raw of rawSponsorships) {
    const row = toSponsorshipRow(raw);
    if (!studentsById.has(row.godparent_id) || !studentsById.has(row.godchild_id)) {
      throw new Error(
        `Dangling sponsorship "${row.id}": missing student "${row.godparent_id}" or "${row.godchild_id}".`,
      );
    }
    if (row.godparent_id === row.godchild_id) {
      throw new Error(`Self-loop sponsorship detected: "${row.id}".`);
    }
    const tripleKey = `${row.godparent_id}|${row.godchild_id}|${row.semester}`;
    if (seenTriples.has(tripleKey)) {
      continue;
    }
    seenTriples.add(tripleKey);
    sponsorshipsById.set(row.id, row);
  }

  return {
    studentRows: Array.from(studentsById.values()),
    sponsorshipRows: Array.from(sponsorshipsById.values()),
  };
}

function buildPostgrestHeaders(apiKey) {
  const headers = {
    apikey: apiKey,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  };
  // New Supabase secret keys (sb_secret_...) are opaque strings and must only
  // be sent in the apikey header; legacy service_role JWTs also need Bearer.
  if (!apiKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

async function upsertBatches({ supabaseUrl, apiKey, table, rows, batchSize }) {
  const endpoint = `${supabaseUrl}/rest/v1/${table}?on_conflict=id`;
  const headers = buildPostgrestHeaders(apiKey);
  let migrated = 0;

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(
        `PostgREST upsert failed for ${table} batch [${offset}..${offset + batch.length - 1}] (${response.status} ${response.statusText}): ${details}`,
      );
    }
    const returned = await response.json().catch(() => null);
    migrated += Array.isArray(returned) ? returned.length : batch.length;
  }

  return migrated;
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!config.dryRun) {
    if (!supabaseUrl) {
      throw new Error('Missing SUPABASE_URL environment variable.');
    }
    if (!apiKey) {
      throw new Error('Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variable.');
    }
  }

  const sourceLabel = config.sourceType === 'dir' ? `directory ${config.sourceTarget}` : `API ${config.sourceTarget}`;
  console.log(`Loading data from ${sourceLabel}...`);

  const rawData =
    config.sourceType === 'dir'
      ? await loadFromDir(config.sourceTarget)
      : await loadFromApi(config.sourceTarget);

  const { studentRows, sponsorshipRows } = prepareRows(rawData.students, rawData.sponsorships);

  if (config.dryRun) {
    console.log(
      `Dry run validated: ${studentRows.length} students and ${sponsorshipRows.length} sponsorships ready to migrate.`,
    );
    return;
  }

  const migratedStudents = await upsertBatches({
    supabaseUrl,
    apiKey,
    table: 'students',
    rows: studentRows,
    batchSize: config.batchSize,
  });

  const migratedSponsorships = await upsertBatches({
    supabaseUrl,
    apiKey,
    table: 'sponsorships',
    rows: sponsorshipRows,
    batchSize: config.batchSize,
  });

  console.log(`Migration complete: ${migratedStudents} students and ${migratedSponsorships} sponsorships upserted to Supabase.`);
}

main().catch((error) => {
  console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
