-- Familia CDIA - Supabase / PostgreSQL Schema
-- Idempotent DDL following Supabase & PostgreSQL best practices:
-- - Explicit schemas, lowercase identifiers, FK indexes, partial pending index
-- - Row-Level Security (RLS) enabled on every exposed public table
-- - Private schema trigger function for automated approval workflow

-- ============================================================================
-- 1. Core Tables (public)
-- ============================================================================

create table if not exists public.students (
  id text primary key,
  canonical_name text not null,
  display_name text not null,
  matricula text unique,
  cohort text not null,
  aliases text[] not null default array[]::text[],
  sigaa_verified boolean not null default false,
  match_confidence text not null default 'PDF_ONLY'
    check (match_confidence in ('EXACT', 'TOKEN_SUBSET', 'FUZZY', 'PDF_ONLY')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsorships (
  id text primary key,
  godparent_id text not null references public.students (id) on delete cascade,
  godchild_id text not null references public.students (id) on delete cascade,
  semester text not null,
  source_doc text not null default 'user-added',
  created_at timestamptz not null default now(),
  constraint sponsorships_no_self_loop check (godparent_id <> godchild_id),
  constraint sponsorships_unique_triple unique (godparent_id, godchild_id, semester)
);

create table if not exists public.sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('sponsorship', 'standalone')),
  summary text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================

create index if not exists idx_sponsorships_godparent_id
  on public.sponsorships (godparent_id);

create index if not exists idx_sponsorships_godchild_id
  on public.sponsorships (godchild_id);

create index if not exists idx_sponsorship_requests_pending
  on public.sponsorship_requests (status)
  where status = 'pending';

-- ============================================================================
-- 3. Row-Level Security (RLS) & Least-Privilege Grants
-- ============================================================================

alter table public.students enable row level security;
alter table public.sponsorships enable row level security;
alter table public.sponsorship_requests enable row level security;

-- Public read-only access for students and sponsorships (no writes for anon/authenticated)
revoke all on table public.students from anon, authenticated;
grant select on table public.students to anon, authenticated;

revoke all on table public.sponsorships from anon, authenticated;
grant select on table public.sponsorships to anon, authenticated;

-- No direct client access to moderation queue (backend secret key / dashboard admin only)
revoke all on table public.sponsorship_requests from anon, authenticated;

drop policy if exists "Public read access to students" on public.students;
create policy "Public read access to students"
  on public.students
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read access to sponsorships" on public.sponsorships;
create policy "Public read access to sponsorships"
  on public.sponsorships
  for select
  to anon, authenticated
  using (true);

-- Intentionally NO RLS policies on public.sponsorship_requests for anon/authenticated.

-- ============================================================================
-- 4. Private Schema & Automatic Approval Trigger
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_request_approval()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status = 'approved' then
    if jsonb_typeof(new.payload -> 'students') = 'array' then
      insert into public.students (
        id,
        canonical_name,
        display_name,
        matricula,
        cohort,
        aliases,
        sigaa_verified,
        match_confidence,
        notes
      )
      select
        btrim(s ->> 'id'),
        btrim(coalesce(s ->> 'canonical_name', s ->> 'canonicalName')),
        btrim(coalesce(s ->> 'display_name', s ->> 'displayName', s ->> 'canonical_name', s ->> 'canonicalName')),
        nullif(btrim(coalesce(s ->> 'matricula', '')), ''),
        btrim(s ->> 'cohort'),
        coalesce(
          (
            select array_agg(alias_val)
            from jsonb_array_elements_text(
              case
                when jsonb_typeof(s -> 'aliases') = 'array' then s -> 'aliases'
                else '[]'::jsonb
              end
            ) as alias_val
          ),
          array[]::text[]
        ),
        coalesce((s ->> 'sigaa_verified')::boolean, (s ->> 'sigaaVerified')::boolean, false),
        coalesce(nullif(btrim(coalesce(s ->> 'match_confidence', s ->> 'matchConfidence', '')), ''), 'PDF_ONLY'),
        nullif(btrim(coalesce(s ->> 'notes', '')), '')
      from jsonb_array_elements(new.payload -> 'students') as s
      on conflict (id) do nothing;
    end if;

    if jsonb_typeof(new.payload -> 'sponsorships') = 'array' then
      insert into public.sponsorships (
        id,
        godparent_id,
        godchild_id,
        semester,
        source_doc
      )
      select
        coalesce(
          nullif(btrim(e ->> 'id'), ''),
          concat_ws(
            '-',
            btrim(e ->> 'semester'),
            btrim(coalesce(e ->> 'godparent_id', e ->> 'godparentId')),
            btrim(coalesce(e ->> 'godchild_id', e ->> 'godchildId'))
          )
        ),
        btrim(coalesce(e ->> 'godparent_id', e ->> 'godparentId')),
        btrim(coalesce(e ->> 'godchild_id', e ->> 'godchildId')),
        btrim(e ->> 'semester'),
        coalesce(nullif(btrim(coalesce(e ->> 'source_doc', e ->> 'sourceDoc', '')), ''), 'user-added')
      from jsonb_array_elements(new.payload -> 'sponsorships') as e
      on conflict (godparent_id, godchild_id, semester) do nothing;
    end if;

    new.reviewed_at := now();
  elsif old.status is distinct from 'rejected' and new.status = 'rejected' then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.handle_request_approval() from public, anon, authenticated;
revoke execute on function private.handle_request_approval() from public, anon, authenticated;

drop trigger if exists trg_sponsorship_requests_approval on public.sponsorship_requests;
create trigger trg_sponsorship_requests_approval
  before update on public.sponsorship_requests
  for each row
  execute function private.handle_request_approval();
