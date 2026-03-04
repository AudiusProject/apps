# Update profile (Web)

Minimal Vite + React app that lets users **sign in via OAuth** and **update their profile description** using a server-side write. Use this as a reference for:

- **SDK setup** in a browser / Vite app (singleton, node polyfills)
- **OAuth redirect flow** (scope=write) — user redirects to audius.co, returns to `/oauth/callback`
- **Token verification** via `sdk.users.verifyIDToken()`
- **Server-side writes** — client POSTs `{ userId, description }` to your server; server uses developer app bearer + `sdk.users.updateUser()`

Mirrors the [mobile update-profile example](../../mobile/examples/update-profile/): same SDK usage, OAuth flow, and server contract, with a web UI.

## Requirements

- **Your own server** with `AUDIUS_API_KEY` and `AUDIUS_BEARER_TOKEN` in `.env`
- **Developer app** at [audius.co/settings](https://audius.co/settings) → Developer Apps

## How to run

### 1. Build the SDK and run the server

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/web/examples/update-profile/server
cp .env.example .env
# Edit .env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN (from audius.co/settings)
npm install
npm start
```

Server runs at `http://localhost:3001`:

- `POST /update-description` — body: `{ userId, description }` — uses developer app bearer to update that user's bio

### 2. Run the client

In another terminal:

```bash
cd packages/web/examples/update-profile
cp .env.example .env
# Edit .env: VITE_AUDIUS_API_KEY (same as server), VITE_WRITE_SERVER_URL=http://localhost:3001
npm install
npm run dev
```

Or from repo root: `npm run web:example:update-profile` (run `npm install` in the example dir first).

Open the URL shown (default `http://localhost:5175`). Sign in with Audius (write scope) → enter description → click **Update description**.

## Flow

1. User clicks "Sign in with Audius" → redirects to audius.co with **scope=write**
2. After auth, user is redirected to `/oauth/callback?token=...&state=...`
3. Client verifies state, calls `verifyIDToken` to get `userId`
4. User enters description; client `POST`s `{ userId, description }` to `/update-description`
5. Server uses `sdk({ apiKey, bearerToken })` with the developer app bearer to call `updateUser` for that `userId`

## Project layout

| File | Purpose |
|------|---------|
| `index.html` | Entry HTML; script loads `src/main.tsx`. |
| `src/main.tsx` | Mounts `App` into `#root`. |
| `src/sdk.ts` | Singleton `getSDK()` — `sdk({ appName, apiKey? })`. |
| `src/config.ts` | Reads `VITE_WRITE_SERVER_URL`, `VITE_AUDIUS_API_KEY` from env. |
| `src/oauth/buildOAuthUrl.ts` | OAuth URL with scope=write, redirect_uri, state. |
| `src/App.tsx` | OAuth redirect handling, sign-in UI, description form, update POST. |
| `server/server.js` | Express server; uses developer app bearer; `POST /update-description`. |
| `vite.config.ts` | React plugin + node polyfills (buffer, process) for SDK. |

## Keywords (for search / AI)

SDK setup, Vite, React, OAuth, update profile, updateUser, verifyIDToken, server-side writes, developer app bearer, Audius SDK, web example, node polyfills.

## Source of truth (implementation)

- **SDK factory:** `packages/sdk/src/sdk/sdk.ts` — `sdk(config)` with `appName`, `apiKey`, `bearerToken`.
- **Users API:** `packages/sdk` — `verifyIDToken`, `getUser`, `updateUser`.
- **Mobile counterpart:** `packages/mobile/examples/update-profile/` — same pattern for Expo (WebView OAuth).
