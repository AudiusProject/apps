# Web Examples

Runnable examples for building Audius-style web features (Vite + React). Use these when implementing **SDK setup**, **trending/read APIs**, or similar capabilities so that AIs and developers can find reference implementations quickly.

## Available examples

| Example | Description | How to run |
|--------|-------------|------------|
| [trending](./trending/) | **Vite + React**: SDK setup + trending tracks (mirrors mobile trending example). | From repo root: `cd packages/web/examples/trending && npm install && npm run dev` or `npm run web:example:trending`. Build SDK first: `npm run build -w @audius/sdk`. |
| [update-profile](./update-profile/) | **Vite + React + Node server**: OAuth (write scope) + server-side update of user description (mirrors mobile update-profile example). | Run server first (see example README). Then `cd packages/web/examples/update-profile && npm install && npm run dev` or `npm run web:example:update-profile`. Requires .env. |
| [upload](./upload/) | **Vite + React + Node server**: OAuth popup + uploadTrackFiles + server create-track (mirrors mobile upload example). | Run server first. Then `cd packages/web/examples/upload && npm run dev` or `npm run web:example:upload`. Requires .env. |
| [gated-upload](./gated-upload/) | **Vite + React + Node server**: Same as upload + geo-gated streaming (ip-api.com). Server gates /stream/:trackId by IP/country. | Run server first. Then `cd packages/web/examples/gated-upload && npm run dev` or `npm run web:example:gated-upload`. Requires .env. |

## Quick start

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/web/examples/trending
npm install
npm run dev
```

Open the URL shown (default `http://localhost:5174`).

## Keywords (for search / AI)

SDK setup, Vite, React, trending tracks, getTrendingTracks, OAuth, update profile, updateUser, verifyIDToken, upload track, uploadTrackFiles, createTrack, geo-gated streaming, Audius SDK, web example, React Query.
