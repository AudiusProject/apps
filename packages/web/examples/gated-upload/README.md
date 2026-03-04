# Gated upload (Web)

Minimal Vite + React app that demonstrates **programmable distribution** with geo-gating. Users sign in via OAuth (popup), upload a track, and stream via the access server.

The uploaded track contains an "access authority" which is a key that controls who is allowed to stream the track. Unless the access authority signs the request to the protocol, the track cannot be streamed.

This example uses a geofenced stream to demonstrate this. The track is uploaded and streaming access is only granted to ALLOWED_COUNTRIES, set in the environment.

Pattern from [gate-release-access.mdx](https://github.com/AudiusProject/open-audio-docs/blob/main/docs/pages/tutorials/gate-release-access.mdx): tracks have `access_authorities` set to the server's signer address. The server holds the private key and signs stream URLs. The node validates the signature. Additionally, the server only redirects if the client IP is in allowed countries (ip-api.com).

## How it works

1. **Upload** — Same as the [upload example](../upload/): OAuth, uploadTrackFiles, create-track. The server sets `access_authorities: [signerAddress]` so only our server can authorize streams.
2. **Stream** — Client hits `GET /stream/:trackId`. Server checks geo (client IP must be in ALLOWED_COUNTRIES), fetches stream URL from API, signs it, and redirects. Protocol validates the signature; server enforces geo.
3. **My region** — `GET /my-region` returns `{ ip, country, city, allowed }` for the requesting client. When running locally, the client fetches its public IP from ipify and retries with `?ip=` for accurate geo.

## Requirements

- AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN
- SIGNER_PRIVATE_KEY (required for gated streaming)
- ALLOWED_COUNTRIES (optional, default: United States; comma-separated)

## How to run

### 1. Run the server

```bash
npm install
npm run build -w @audius/sdk
cd packages/web/examples/gated-upload/server
cp .env.example .env
# Edit: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN, SIGNER_PRIVATE_KEY, AUTHORIZED_COUNTRIES
npm install
npm start
```

Server at `http://localhost:3004`:

- `POST /create-track` — create track with access_authorities = signer address
- `GET /stream/:trackId` — geo-gate + sign stream URL and redirect (ip-api.com + protocol)
- `GET /my-region` — returns client IP, country, city, allowed

### 2. Run the client

```bash
cd packages/web/examples/gated-upload
cp .env.example .env
# VITE_AUDIUS_API_KEY, VITE_WRITE_SERVER_URL=http://localhost:3004
npm install
npm run dev
```

Or: `npm run web:example:gated-upload` from repo root.

## Next steps
