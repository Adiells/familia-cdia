# Deployment

## Local development

Run the standalone backend API and frontend in separate terminals:

```sh
npm run dev:backend
```

```sh
npm run dev
```

Per `src/lib/api.ts`, when running on `localhost` or `127.0.0.1` the frontend automatically targets `http://localhost:8080/api/sponsorships` even without `NEXT_PUBLIC_API_URL` set. Set `NEXT_PUBLIC_API_URL` (for example, `NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev` or a staging URL) to override the target API origin.

## GitHub Pages frontend

All API endpoints live in the standalone backend (`backend/server.mjs`); the Next.js app is exported as a static frontend. The `.github/workflows/deploy-pages.yml` workflow builds `out/` with `npm run build:pages` and deploys it to GitHub Pages on pushes to `main`.

Configure the following repository Actions variables (or secrets where noted):

- `NEXT_PUBLIC_API_URL`: public base URL of the deployed backend (for example, `https://familia-cdia-api-<hash>-uc.a.run.app`). The workflow checks repository variables first, then repository secrets, and falls back to its configured default URL if unset. This value is embedded in the public frontend bundle and must not contain credentials.
- `NEXT_PUBLIC_BASE_PATH`: optional path prefix. Project Pages defaults to `/<repository-name>`, and an `<owner>.github.io` repository defaults to the root. Set it to `.` to explicitly deploy at the root (for example, with a custom domain), or to another slash-prefixed path when needed.

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Cloud Run backend

Create a regional Standard Google Cloud Storage bucket in `us-central1` (Always Free tier) and seed it with `src/data/{students,sponsorships,sigaa-students}.json`.

Because `backend/Dockerfile` runs `COPY data/*.json ./data/` and `/backend/data/` is gitignored, copy the seed JSON files into `backend/data/` before building from source (at runtime, the GCS bucket mounted at `/app/data` overlays this directory with live data):

```sh
mkdir -p backend/data
cp src/data/students.json src/data/sponsorships.json src/data/sigaa-students.json backend/data/
```

Then deploy `backend/` mounting the bucket at `/app/data` with `--execution-environment=gen2`, `--max-instances=1`, and your frontend origin in `ALLOWED_ORIGIN`:

```sh
gcloud run deploy familia-cdia-api \
  --source ./backend \
  --region us-central1 \
  --execution-environment gen2 \
  --max-instances 1 \
  --set-env-vars ALLOWED_ORIGIN=https://<YOUR_DOMAIN> \
  --add-volume name=data,type=cloud-storage,bucket=<YOUR_GCS_BUCKET> \
  --add-volume-mount volume=data,mount-path=/app/data \
  --allow-unauthenticated
```

Use the resulting HTTPS service URL as `NEXT_PUBLIC_API_URL`.

### Backing up and updating live GCS data

Maintainers can pull a backup or push manual edits (data corrections, removals, or a refreshed `sigaa-students.json`) directly against the bucket:

```sh
# Download a local backup of live production data
gcloud storage cp "gs://<YOUR_GCS_BUCKET>/*.json" ./backup-data/

# Upload corrected datasets or an updated SIGAA directory
gcloud storage cp src/data/students.json src/data/sponsorships.json src/data/sigaa-students.json gs://<YOUR_GCS_BUCKET>/
```

## Supabase primary database and moderation (optional)

`backend/server.mjs` can use Supabase (PostgREST over native `fetch`) as the primary database with mandatory maintainer approval, while keeping the `/app/data` GCS bucket as an automatically synced backup and read fallback:

1. **Apply the SQL schema**: execute `supabase/schema.sql` in the Supabase SQL Editor (creates `public.students`, `public.sponsorships`, and `public.sponsorship_requests` with RLS and the approval trigger).
2. **Migrate current data**: run the idempotent seed/upsert script against your Supabase project:
   ```sh
   SUPABASE_URL=https://<PROJECT_REF>.supabase.co \
   SUPABASE_SECRET_KEY=<YOUR_SECRET_KEY> \
   node scripts/migrate_to_supabase.mjs
   ```
3. **Configure Cloud Run environment variables** (prefer Secret Manager for `SUPABASE_SECRET_KEY` and `SYNC_TOKEN`):
   - `SUPABASE_URL`: Supabase project URL (`https://<PROJECT_REF>.supabase.co`).
   - `SUPABASE_SECRET_KEY` (or legacy fallback `SUPABASE_SERVICE_ROLE_KEY`): server-side secret key (never expose to the frontend).
   - `SYNC_TOKEN`: bearer token protecting `POST /api/sync-backup`.
   - `BACKUP_SYNC_INTERVAL_MS`: optional background sync interval from Supabase to `/app/data` (default `21600000` = 6 hours).
4. **Enable periodic GitHub Actions sync**: set `SYNC_TOKEN` as a repository Actions secret. `.github/workflows/sync-backup.yml` runs every 3 days (`0 4 */3 * *`) to call `POST /api/sync-backup`, keeping the GCS backup fresh and preventing Supabase Free Tier inactivity pauses.

When Supabase is enabled, `POST /api/sponsorships` validates inputs and queues them in `public.sponsorship_requests` (`status = 'pending'`), returning HTTP `202`. If Supabase is unreachable or times out, `GET /api/sponsorships` automatically falls back to `/app/data`.
