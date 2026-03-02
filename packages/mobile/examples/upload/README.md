# Upload example

Demonstrates **server-side track creation** using your developer app's bearer token. Same pattern as [update-profile](../update-profile/) and [like-repost](../like-repost/): the bearer lives on the server. The client uploads the audio (and optional cover) via the SDK to get CIDs, then sends `{ userId, metadata }` to your server; the server uses the developer app bearer to call `createTrack`.

## Requirements

- **Your own server** with `AUDIUS_API_KEY` and `AUDIUS_BEARER_TOKEN` in `.env`
- **Developer app** at [audius.co/settings](https://audius.co/settings) → Developer Apps

## Quick start

### 1. Build the SDK and run the server

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/upload/server
cp .env.example .env
# Edit .env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN (from audius.co/settings)
npm install
npm start
```

Server runs at `http://localhost:3003`:

- `POST /create-track` — body: `{ userId, metadata }` — metadata must include `title`, `genre`, `trackCid` (from client's audio upload). Server uses developer app bearer to create the track for that user. Tracks are created as **private** (unlisted: hidden from search and feeds, only accessible via direct link).

### 2. Run the client

In another terminal:

```bash
cd packages/mobile/examples/upload
cp .env.example .env
# Edit .env: EXPO_PUBLIC_AUDIUS_API_KEY (same as server), EXPO_PUBLIC_WRITE_SERVER_URL=http://localhost:3003
npm install
npx expo start
```

Use the same API key on client and server so OAuth connects the user to your developer app.

Press `i` (iOS) or `a` (Android). Sign in with Audius (write scope) → pick audio (and optional cover) → enter title, genre, description → tap **Upload**. The client uploads files via the SDK, then sends metadata to your server to create the track.

**Android emulator:** use `EXPO_PUBLIC_WRITE_SERVER_URL=http://10.0.2.2:3003`.

## Flow

1. User signs in via OAuth at audius.co with **scope=write**.
2. Client verifies token to get `userId`.
3. User picks audio (and optional cover), fills title/genre/description, taps Upload.
4. Client calls `sdk.tracks.uploadTrackFiles({ audioFile, imageFile })` to upload to storage; gets back CIDs and duration.
5. Client `POST`s `{ userId, metadata }` to `/create-track` (metadata includes `trackCid`, `duration`, etc.).
6. Server uses `sdk({ apiKey, bearerToken }).tracks.createTrack({ userId, metadata })` to create the track.

## Source

| Path | Purpose |
|------|---------|
| `server/server.js` | Uses developer app bearer; `POST /create-track` |
| `src/config.ts` | Reads `EXPO_PUBLIC_WRITE_SERVER_URL`, optional `EXPO_PUBLIC_AUDIUS_API_KEY` |
| `src/sdk.ts` | `getSDK()` — SDK for verify, uploadTrackFiles |
| `src/oauth/buildOAuthUrl.ts` | OAuth URL with scope=write |
| `App.tsx` | OAuth sign-in → pick file → metadata form → upload files → POST to server |

## "Failed to create track"

If the UI shows **"Failed to create track"** (or the server logs it), the discovery node is rejecting the **create track** transaction. Common causes:

- **Signer vs owner**: The API signs the transaction with the **developer app's** wallet (from your bearer token) but creates the track for the **OAuth user**. The protocol may require the track **owner's wallet** to sign. The main Audius app uses Hedgehog (the user's managed wallet) for that.
- **Network / config**: Transaction reverted, discovery node config, or rate limits.

Check the **server console** for the full error. The server now logs `[create-track] <status> <body>` on failure. For production-style uploads where the user owns the track, the user's wallet must sign (e.g. main app flow with Hedgehog).

## Keywords (for search / AI)

Upload, track upload, createTrack, uploadTrackFiles, server-side writes, developer app bearer, OAuth.
