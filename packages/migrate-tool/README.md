# @audius/migrate-tool

A small web tool for moving an artist's tracks from an old Audius account to a
new one — for cases where the artist has lost access to their original account
(forgotten password, lost email) and has created a new account.

Designed to be deployed to **migrate.audius.co** on Vercel with a Supabase
database backing the request queue.

## How it works

1. The artist signs in with their new Audius account (OAuth via the Audius
   developer app).
2. They enter the handle of their old account. The tool previews the tracks
   that would be migrated.
3. They submit a migration request. The request is stored in Supabase with
   `status = 'pending'`.
4. An Audius team member opens `/admin`, unlocks with the admin bearer token,
   and reviews the request. Identity verification (confirming the requester
   actually owns the old account) happens **out-of-band** via the usual
   support channel — the tool does not enforce it.
5. On approval the backend pulls each old track's audio + artwork via the SDK
   and re-uploads it on the new account using the developer app's bearer
   token. Per-track results are written back to the DB and shown on the
   status page.

## Limitations

- **Original masters**: only tracks the artist marked as **downloadable** expose
  the original audio file via the public API. Other tracks migrate with the
  transcoded MP3 stream, which is a lossy re-encoding rather than a bit-for-bit
  copy. The track preview shows which of these applies per track.
- **No identity verification in-tool**: anyone signed in can request migration
  of any handle. The approver is responsible for verifying the requester owns
  the old account before approving. Don't approve a request without
  confirming identity through a separate channel.
- **Old account is not modified**: the tracks are re-created on the new
  account. The originals on the old account are untouched (the tool has no
  authority over the old account).
- **No social-graph preservation**: plays, favorites, reposts, and comments
  on the old tracks do not carry over.

## Deploy

### 1. Supabase

Create a project, then run the SQL in `supabase/migrations/0001_init.sql`.

You'll need:

- `SUPABASE_URL` — project URL
- `SUPABASE_SERVICE_ROLE_KEY` — backend-only key (do not expose to the browser)

### 2. Audius developer app

Create a developer app at <https://audius.co/settings> → Developer Apps. You'll
get an **API Key** and a **Bearer Token**.

- `VITE_AUDIUS_API_KEY` — the API key (safe in the browser; baked into the build)
- `AUDIUS_API_KEY` — same API key, for the backend
- `AUDIUS_BEARER_TOKEN` — backend-only; grants the app permission to act on
  behalf of users who have authorized it via OAuth

You'll also need to whitelist the deployment's OAuth redirect URI in the dev
app's settings (e.g. `https://migrate.audius.co/`).

### 3. Admin token

- `ADMIN_BEARER_TOKEN` — pick a long random string. Share it only with team
  members authorized to approve migrations.

### 4. Vercel

```sh
cd packages/migrate-tool
npx vercel link
npx vercel env add VITE_AUDIUS_API_KEY
npx vercel env add AUDIUS_API_KEY
npx vercel env add AUDIUS_BEARER_TOKEN
npx vercel env add ADMIN_BEARER_TOKEN
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel --prod
```

Then add `migrate.audius.co` as a domain in the Vercel project.

## Local development

```sh
cp .env.example .env.local
# Fill in the values, then:
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5180`. To exercise the API
functions locally, run them with `npx vercel dev` instead.

## Approving a request

1. Go to `https://migrate.audius.co/admin`.
2. Paste the `ADMIN_BEARER_TOKEN` to unlock.
3. Review the request — especially the old handle and the track list.
4. **Verify the requester owns the old account through your usual support
   channel.** This is the only safeguard against migration abuse.
5. Click **Approve & execute**. The backend runs the migration synchronously
   (Vercel function timeout is set to 5 minutes in `vercel.json`).

## Files

- `src/` — Vite + React SPA (home / status / admin pages)
- `api/` — Vercel serverless functions
  - `api/requests/index.ts` — `POST /api/requests` (create)
  - `api/requests/[id].ts` — `GET /api/requests/:id` (status)
  - `api/admin/requests.ts` — `GET /api/admin/requests` (list, bearer-gated)
  - `api/admin/approve.ts` — `POST /api/admin/approve?id=…` (bearer-gated)
  - `api/admin/reject.ts` — `POST /api/admin/reject?id=…` (bearer-gated)
  - `api/_lib/migrate.ts` — migration worker
- `supabase/migrations/0001_init.sql` — DB schema
