# Upload track (Web)

Minimal Vite + React app that lets users **sign in via OAuth** (popup) and **upload a track** using the SDK. Use this as a reference for:

- **SDK setup** in a browser / Vite app (singleton, node polyfills)
- **OAuth popup flow** (scope=write) — opens popup, postMessage for token
- **uploadTrackFiles** — client uploads audio + cover to storage
- **Server-side createTrack** — client POSTs `{ userId, metadata }`; server uses developer app bearer

Mirrors the [mobile upload example](../../mobile/examples/upload/): same SDK usage, OAuth flow, and server contract.

## Requirements

- **Your own server** with `AUDIUS_API_KEY` and `AUDIUS_BEARER_TOKEN` in `.env`
- **Developer app** at [audius.co/settings](https://audius.co/settings) → Developer Apps

## How to run

### 1. Build the SDK and run the server

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/web/examples/upload/server
cp .env.example .env
# Edit .env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN
npm install
npm start
```

Server runs at `http://localhost:3003`:

- `POST /create-track` — body: `{ userId, metadata }` — uses developer app bearer

### 2. Run the client

In another terminal:

```bash
cd packages/web/examples/upload
cp .env.example .env
# Edit .env: VITE_AUDIUS_API_KEY, VITE_WRITE_SERVER_URL=http://localhost:3003
npm install
npm run dev
```

Or from repo root: `npm run web:example:upload`.

Open the URL shown (default `http://localhost:5176`). Sign in with Audius (popup) → pick audio/cover → enter title/genre → click **Upload**.

## Flow

1. User clicks "Sign in with Audius" → popup opens, returns token via postMessage
2. Client verifies token via `verifyIDToken`, gets `userId`
3. User picks audio (required) + cover (optional), enters title/genre
4. Client calls `sdk.tracks.uploadTrackFiles({ audioFile, imageFile })` → gets trackCid, etc.
5. Client POSTs `{ userId, metadata }` to `/create-track`
6. Server uses `sdk({ apiKey, bearerToken }).tracks.createTrack()` with developer app bearer
