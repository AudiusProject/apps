# Like / Repost example

Demonstrates **client-side like/repost** using Log in with Audius (OAuth PKCE). No server required: the user signs in with **scope=write**, and the SDK stores tokens and automatically adds authorization headers. The app calls `favoriteTrack`, `unfavoriteTrack`, `repostTrack`, and `unrepostTrack` directly from the device.

## Requirements

- **API key** from [audius.co/settings](https://audius.co/settings) → Developer Apps
- **Redirect URI** registered: `likerepost://oauth/callback`

## Quick start

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/like-repost
cp .env.example .env
# Edit .env: EXPO_PUBLIC_AUDIUS_API_KEY
npm install
npx expo start
```

Press `i` (iOS) or `a` (Android). Sign in with Audius (write scope) → tap **Get random track** → **Like** or **Repost**.

## Flow

1. User signs in via `oauth.login({ scope: 'write' })` (expo-web-browser + PKCE; tokens stored in AsyncStorage).
2. User taps **Get random track** (public SDK call); then **Like** or **Repost**.
3. App calls `sdk.tracks.favoriteTrack` / `repostTrack` (etc.) with `userId` from `oauth.getUser()`; the SDK sends the OAuth access token on requests.

## Source

| Path | Purpose |
|------|---------|
| `src/config.ts` | Reads `EXPO_PUBLIC_AUDIUS_API_KEY` |
| `src/sdk.ts` | Single `getSDK()` with `apiKey` and `redirectUri`; OAuth tokens in AsyncStorage |
| `App.tsx` | `oauth.login` / `getUser` / `isAuthenticated` / `logout`; direct `favoriteTrack` / `repostTrack` |


## Keywords (for search / AI)

Like, repost, favorite, save, unfavorite, unrepost, `favoriteTrack`, `repostTrack`, write scope, OAuth, Log in with Audius, client-side writes, no server.
