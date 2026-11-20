# Deployment

## Local development

Run the API and frontend in separate terminals:

```sh
npm run dev:backend
```

```sh
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

The frontend uses the local backend when `NEXT_PUBLIC_API_URL` is set. Without static-export flags, Next.js retains its normal development and server configuration.

## GitHub Pages frontend

The `Deploy frontend to GitHub Pages` workflow builds `out/` with `npm run build:pages` and deploys it on pushes to `main`. The export build temporarily removes the dynamic Next.js sponsorship route because static export does not support request-time `GET`/`POST` handlers, then restores the route even if the build fails. Normal `npm run dev`, `npm run build`, and `npm run start` retain the local Next.js API.

Set the following repository Actions variables:

- `NEXT_PUBLIC_API_URL`: public base URL of the deployed backend (for example, `https://familia-cdia-api-<hash>-uc.a.run.app`). The workflow also accepts this value from a repository secret with the same name. This value is embedded in the public frontend bundle and must not contain credentials.
- `NEXT_PUBLIC_BASE_PATH`: optional path prefix. Project Pages defaults to `/<repository-name>`, and an `<owner>.github.io` repository defaults to the root. Set it to `.` to explicitly deploy at the root, or to another slash-prefixed path when needed.

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Cloud Run backend

Create a regional Standard bucket in `us-central1` (Always Free tier) and seed it with `src/data/{students,sponsorships,sigaa-students}.json`, then deploy `backend/` mounting that bucket at `/app/data` with `--execution-environment=gen2` and `--max-instances=1`:

```sh
gcloud run deploy familia-cdia-api \
  --source ./backend \
  --region us-central1 \
  --execution-environment gen2 \
  --max-instances 1 \
  --add-volume name=data,type=cloud-storage,bucket=familia-cdia-data-bot-games-511122 \
  --add-volume-mount volume=data,mount-path=/app/data \
  --allow-unauthenticated
```

Use the resulting HTTPS service URL as `NEXT_PUBLIC_API_URL`. Configure the backend's CORS allowlist for the GitHub Pages origin before accepting browser requests.
