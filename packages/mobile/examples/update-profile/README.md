# Update profile example

Demonstrates **server-side writes** using your developer app's bearer token. The bearer lives on the server (same token for all writes). Users sign in via OAuth so the client knows their `userId`; they send `{ userId, description }`; your server uses the developer app bearer to perform the write.

## Requirements

- **Your own server** with `AUDIUS_API_KEY` and `AUDIUS_BEARER_TOKEN` in `.env`
- **Developer app** at [audius.co/settings](https://audius.co/settings) → Developer Apps

## Quick start

### 1. Build the SDK and run the server

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/update-profile/server
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
cd packages/mobile/examples/update-profile
cp .env.example .env
# Edit .env: EXPO_PUBLIC_AUDIUS_API_KEY (same as server), EXPO_PUBLIC_WRITE_SERVER_URL=http://localhost:3001
npm install
npx expo start
```

Use the same API key on client and server so OAuth connects the user to your developer app.

Press `i` (iOS) or `a` (Android). Sign in with Audius (write scope) → enter description → tap **Update description**.

**Android emulator:** use `EXPO_PUBLIC_WRITE_SERVER_URL=http://10.0.2.2:3001`.

## Flow

1. User signs in via OAuth at audius.co with **scope=write**.
2. Client verifies token to get `userId`.
3. User enters description; client `POST`s `{ userId, description }` to `/update-description`.
4. Server uses `sdk({ apiKey, bearerToken })` with the developer app bearer to call `updateUser` for that `userId`.

## Source

| Path | Purpose |
|------|---------|
| `server/server.js` | Uses developer app bearer from env for all writes; `POST /update-description` |
| `src/config.ts` | Reads `EXPO_PUBLIC_WRITE_SERVER_URL`, optional `EXPO_PUBLIC_AUDIUS_API_KEY` |
| `src/oauth/buildOAuthUrl.ts` | OAuth URL with scope=write |
| `App.tsx` | OAuth sign-in → form to update description (sends userId from verify) |
