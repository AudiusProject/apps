# Update profile example

Demonstrates **client-side profile updates** using Log in with Audius (OAuth PKCE). No server required: the user signs in with **scope=write**, and the SDK stores tokens and adds authorization headers. The app calls `updateUser` (e.g. update bio) directly from the device.

## Requirements

- **API key** from [audius.co/settings](https://audius.co/settings) → Developer Apps
- **Redirect URI** registered: `updateprofile://oauth/callback`

## Quick start

From the **apps repo root**:

```bash
npm install
npm run build -w @audius/sdk
cd packages/mobile/examples/update-profile
cp .env.example .env
# Edit .env: EXPO_PUBLIC_AUDIUS_API_KEY
npm install
npx expo start
```

Press `i` (iOS) or `a` (Android). Sign in with Audius (write scope) → enter description → tap **Update description**.

## Flow

1. User signs in via `oauth.login({ scope: 'write' })` (expo-web-browser + PKCE; tokens in AsyncStorage).
2. User edits description and taps **Update description**.
3. App calls `sdk.users.updateUser({ id, userId, metadata: { bio } })`; the SDK sends the OAuth access token.

## Source

| Path | Purpose |
|------|---------|
| `src/config.ts` | Reads `EXPO_PUBLIC_AUDIUS_API_KEY` |
| `src/sdk.ts` | Single `getSDK()` with `apiKey` and `redirectUri` |
| `App.tsx` | `oauth.login` / `getUser` / `isAuthenticated` / `logout`; direct `updateUser` |

