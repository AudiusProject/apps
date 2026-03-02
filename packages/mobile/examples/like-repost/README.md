# Like / Repost example

Demonstrates **server-side like/repost** using your developer app's bearer token. Same pattern as [update-profile](../update-profile/): the bearer lives on the server; the client signs in via OAuth to get `userId`, then sends `{ userId, trackId, action }` to the server; the server uses the developer app bearer to perform the write.

## Requirements

- **Your own server** with `AUDIUS_API_KEY` and `AUDIUS_BEARER_TOKEN` in `.env`
- **Developer app** at [audius.co/settings](https://audius.co/settings) → Developer Apps

## Quick start

### 1. Build the SDK and run the server

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/like-repost/server
cp .env.example .env
# Edit .env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN (from audius.co/settings)
npm install
npm start
```

Server runs at `http://localhost:3002`:

- `POST /like-repost` — body: `{ userId, trackId, action: 'favorite' | 'unfavorite' | 'repost' | 'unrepost' }` — uses developer app bearer to like/repost for that user

### 2. Run the client

In another terminal:

```bash
cd packages/mobile/examples/like-repost
cp .env.example .env
# Edit .env: EXPO_PUBLIC_AUDIUS_API_KEY (same as server), EXPO_PUBLIC_WRITE_SERVER_URL=http://localhost:3002
npm install
npx expo start
```

Use the same API key on client and server so OAuth connects the user to your developer app.

Press `i` (iOS) or `a` (Android). Sign in with Audius (write scope) → tap **Get random track** → **Like** or **Repost**.

**Android emulator:** use `EXPO_PUBLIC_WRITE_SERVER_URL=http://10.0.2.2:3002`.

## Flow

1. User signs in via OAuth at audius.co with **scope=write**.
2. Client verifies token to get `userId`.
3. User taps **Get random track** (public SDK call); then **Like** or **Repost**.
4. Client `POST`s `{ userId, trackId, action }` to `/like-repost`.
5. Server uses `sdk({ apiKey, bearerToken })` with the developer app bearer to call `favoriteTrack` / `repostTrack` (etc.) for that `userId`.

## Source

| Path | Purpose |
|------|---------|
| `server/server.js` | Uses developer app bearer from env; `POST /like-repost` |
| `src/config.ts` | Reads `EXPO_PUBLIC_WRITE_SERVER_URL`, optional `EXPO_PUBLIC_AUDIUS_API_KEY` |
| `src/sdk.ts` | `getSDK()` — unauthenticated SDK for verify, trending |
| `src/oauth/buildOAuthUrl.ts` | OAuth URL with scope=write |
| `App.tsx` | OAuth sign-in → get random track → like/repost (calls server) |

## Keywords (for search / AI)

Like, repost, favorite, save, unfavorite, unrepost, `favoriteTrack`, `repostTrack`, write scope, OAuth, server-side writes, developer app bearer.
