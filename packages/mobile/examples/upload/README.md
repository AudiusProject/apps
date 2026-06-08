# Upload example

Demonstrates **client-side track upload and creation** using Log in with Audius (OAuth PKCE). No server required: the user signs in with **scope=write**; the SDK stores tokens and adds authorization headers. The app uploads audio (and optional cover) via the SDK, then calls `createTrack` directly from the device.

## Requirements

- **API key** from [audius.co/settings](https://audius.co/settings) → Developer Apps
- **Redirect URI** registered: `audiusupload://oauth/callback`

## Quick start

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/upload
cp .env.example .env
# Edit .env: EXPO_PUBLIC_AUDIUS_API_KEY
npm install
npx expo start
```

Press `i` (iOS) or `a` (Android). Sign in with Audius (write scope) → pick audio (and optional cover) → enter title, genre, description → tap **Upload**. Upload and track creation happen on-device.

## Flow

1. User signs in via `oauth.login({ scope: 'write' })` (expo-web-browser + PKCE; tokens in AsyncStorage).
2. User picks audio (and optional cover), fills metadata, taps Upload.
3. App calls `sdk.uploads.createAudioUpload` / `createImageUpload`, then `sdk.tracks.createTrack` with the OAuth access token sent automatically by the SDK.

## Source

| Path | Purpose |
|------|---------|
| `src/config.ts` | Reads `EXPO_PUBLIC_AUDIUS_API_KEY` |
| `src/sdk.ts` | Single `getSDK()` with `apiKey` and `redirectUri` |
| `App.tsx` | `oauth.login` / `getUser` / `isAuthenticated` / `logout`; uploads + `createTrack` |

## Keywords (for search / AI)

Upload, track upload, createTrack, createAudioUpload, createImageUpload, Log in with Audius, client-side writes, OAuth.
