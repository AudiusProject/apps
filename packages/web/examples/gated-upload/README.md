# Geo-gated upload (Web)

Minimal Vite + React app that demonstrates **geo-gated streaming** using SDK primitives. Users sign in via OAuth (popup), upload a track, and can stream only if their IP resolves to an allowed country (via [ip-api.com](http://ip-api.com)).

Pattern inspired by [gate-release-access.mdx](https://github.com/AudiusProject/open-audio-docs/blob/main/docs/pages/tutorials/gate-release-access.mdx): an access server controls who can stream. Here we use **IP → geo** (ip-api.com) instead of programmable distribution signing.

## How it works

1. **Upload** — Same as the [upload example](../upload/): OAuth, uploadTrackFiles, create-track.
2. **Stream** — Client hits `GET /stream/:trackId` on our server. Server gets client IP from the request, fetches geo from ip-api.com, and only redirects to the Audius stream URL if the country is in the allowlist.
3. **/my-region** — Returns `{ ip, country, city, allowed }` for the requesting client (for UX).

## Requirements

- AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN
- Optional: ALLOWED_COUNTRIES (comma-separated, default: `United States`)

## How to run

### 1. Run the server

```bash
npm install
npm run build -w @audius/sdk
cd packages/web/examples/gated-upload/server
cp .env.example .env
# Edit: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN
# Optional: ALLOWED_COUNTRIES=United States,Canada
npm install
npm start
```

Server at `http://localhost:3004`:

- `POST /create-track` — create track (same as upload example)
- `GET /stream/:trackId` — geo-gate; redirects if allowed, 403 otherwise
- `GET /my-region` — returns client's geo and whether streaming is allowed

### 2. Run the client

```bash
cd packages/web/examples/gated-upload
cp .env.example .env
# VITE_AUDIUS_API_KEY, VITE_WRITE_SERVER_URL=http://localhost:3004
npm install
npm run dev
```

Or: `npm run web:example:gated-upload` from repo root.

## Local testing

When running locally, the server sees `127.0.0.1` as the client IP, so ip-api.com returns no useful geo. For real geo-gating, deploy the server (e.g. Vercel, Railway) so it sees real client IPs. The example still demonstrates the pattern.
