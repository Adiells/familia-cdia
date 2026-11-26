const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const defaultSupabaseTimeoutMs = 5000;

export function buildSupabaseHeaders(extra = {}) {
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

export function fromStudentRow(row) {
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

export function fromSponsorshipRow(row) {
  return {
    id: row.id,
    godparentId: row.godparent_id,
    godchildId: row.godchild_id,
    semester: row.semester,
    sourceDoc: row.source_doc || 'user-added',
  };
}

async function fetchSupabaseTable(table, selectColumns, timeoutMs) {
  const pageSize = 1000;
  const rows = [];
  const deadline = Date.now() + timeoutMs;

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

export async function fetchSupabaseData(timeoutMs = defaultSupabaseTimeoutMs) {
  const [studentRows, sponsorshipRows] = await Promise.all([
    fetchSupabaseTable(
      'students',
      'id,canonical_name,display_name,matricula,cohort,aliases,sigaa_verified,match_confidence,notes,created_at',
      timeoutMs,
    ),
    fetchSupabaseTable(
      'sponsorships',
      'id,godparent_id,godchild_id,semester,source_doc,created_at',
      timeoutMs,
    ),
  ]);
  return {
    students: studentRows.map(fromStudentRow),
    sponsorships: sponsorshipRows.map(fromSponsorshipRow),
  };
}

export async function insertSponsorshipRequest({ requestType, summary, payload }, timeoutMs = defaultSupabaseTimeoutMs) {
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
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Supabase INSERT sponsorship_requests failed (${response.status}): ${details.slice(0, 200)}`);
  }
  const inserted = await response.json();
  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  return row?.id ?? null;
}
