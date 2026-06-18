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
4. An Audius team member opens `/admin`, signs in with their Audius Google
   account (only `@audius.co` / `@audius.org` accounts are allowed), and
   reviews the request. Identity verification (confirming the requester
   actually owns the old account) happens **out-of-band** via the usual
   support channel — the tool does not enforce it.
5. On approval the backend pulls each old track's audio + artwork via the SDK
   and re-uploads it on the new account using the developer app's bearer
   token. Per-track results are written back to the DB and shown on the
   status page.

## Limitations

- **Audio source selection**: the worker tries sources in priority order
  for each track and uses the first one that succeeds:
  1. Raw `orig_file_cid` fetched from the rendezvous-primary validator node
     (`/content/{cid}`) — bit-for-bit copy of the original master,
     regardless of whether the artist marked the track downloadable.
  2. Same CID, mirror node — covers the case where the primary node is
     unhealthy.
  3. Gated download URL — original master, only available when the track
     is flagged downloadable.
  4. Transcoded MP3 stream — lossy, but always reachable. Acts as the
     last-resort fallback so every approved request gets a content copy.
  Sources 1 and 2 are skipped when `orig_file_cid` is missing or
  `is_original_available` is false (legacy uploads or pruned originals).
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
get an **API Key** and an **API Secret**.

- `VITE_AUDIUS_API_KEY` — the API key (safe in the browser; baked into the build)
- `AUDIUS_API_KEY` — same API key, for the backend
- `AUDIUS_API_SECRET` — backend-only; authenticates the app and signs its
  requests server-side. Never expose this in the browser.

You'll also need to whitelist the deployment's OAuth redirect URI in the dev
app's settings (e.g. `https://migrate.audius.co/`).

### 3. Admin auth (Google SSO)

The admin console is gated by Google sign-in restricted to Audius staff
(`@audius.co` / `@audius.org`) — the same pattern as the notifications
dashboard. Create an OAuth 2.0 Web client in Google Cloud Console, add the
deployment origin (e.g. `https://migrate.audius.co`) as an authorized
JavaScript origin, and set:

- `VITE_GOOGLE_CLIENT_ID` — the OAuth client ID (safe in the browser)
- `GOOGLE_CLIENT_ID` — the same client ID, used by the backend to verify
  Google ID tokens
- `AUTH_SESSION_SECRET` — a random string (≥32 chars) that signs the session
  JWT stored in an httpOnly cookie

Optionally, `ADMIN_BEARER_TOKEN` remains as an escape hatch for
programmatic/CLI access to the admin endpoints via
`Authorization: Bearer <token>`. The UI never uses it; leave it unset if you
don't need API access.

### 4. Vercel

```sh
cd packages/migrate-tool
npx vercel link
npx vercel env add VITE_AUDIUS_API_KEY
npx vercel env add VITE_GOOGLE_CLIENT_ID
npx vercel env add AUDIUS_API_KEY
npx vercel env add AUDIUS_API_SECRET
npx vercel env add GOOGLE_CLIENT_ID
npx vercel env add AUTH_SESSION_SECRET
npx vercel env add ADMIN_BEARER_TOKEN   # optional escape hatch
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
2. Sign in with your Audius Google account (`@audius.co` / `@audius.org`).
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
  - `api/auth/index.ts` — `POST /api/auth` (verify Google token, set session)
  - `api/auth/session.ts` — `GET /api/auth/session` (current admin)
  - `api/auth/logout.ts` — `POST /api/auth/logout` (clear session)
  - `api/admin/requests.ts` — `GET /api/admin/requests` (list, admin-gated)
  - `api/admin/approve.ts` — `POST /api/admin/approve?id=…` (admin-gated)
  - `api/admin/reject.ts` — `POST /api/admin/reject?id=…` (admin-gated)
  - `api/_lib/auth.ts` — Google SSO session + admin gate
  - `api/_lib/migrate.ts` — migration worker
- `supabase/migrations/0001_init.sql` — DB schema
