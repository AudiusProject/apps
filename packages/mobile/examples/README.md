# Mobile Examples

Runnable examples for building Audius-style mobile features (React Native). Use these when implementing **authentication (sign-in / OAuth-style flows)** or similar capabilities so that AIs and developers can find reference implementations quickly.

## Quick start (run the app)

From the **repository root** (`apps/`):

```bash
npm install
npm run ios:dev      # iOS simulator
# or
npm run android:dev  # Android emulator
```

Note: each example includes its own `.npmrc` with `legacy-peer-deps=true`,
so `npm install` works without manually passing that flag.

Environment: copy `packages/mobile/.env.dev` if needed; the app runs against staging by default.

## Available examples

All OAuth examples use **Log in with Audius** (OAuth 2.0 PKCE): scoped, short-lived access tokens and refresh tokens stored in AsyncStorage; the SDK automatically adds authorization headers to requests. No backend server required for writes.

| Example | Description | How to run in the app |
|--------|-------------|------------------------|
| [trending](./trending/) | **Expo app**: SDK setup + trending tracks (code example) | From repo root: `cd packages/mobile/examples/trending && npx expo start` or `npm run mobile:example:trending` |
| [auth-sign-in](./auth-sign-in/) | **Expo app**: Sign in with Audius (read scope), restore session, feed, sign out. Main app: Hedgehog email/password. | `cd packages/mobile/examples/auth-sign-in && cp .env.example .env` (set API key, register `audiusauth://oauth/callback`), then `npx expo start`. Main app: open app → sign-in. |
| [like-repost](./like-repost/) | **Expo app (no server)**: OAuth write scope → like/repost a random track from the device. | `cd packages/mobile/examples/like-repost`, `.env` with API key, register `likerepost://oauth/callback`, `npx expo start`. |
| [upload](./upload/) | **Expo app (no server)**: OAuth write scope → pick audio/cover, upload files, create track on-device. | `cd packages/mobile/examples/upload`, `.env` with API key, register `audiusupload://oauth/callback`, `npx expo start`. |
| [update-profile](./update-profile/) | **Expo app (no server)**: OAuth write scope → update user description (bio) from the app. | `cd packages/mobile/examples/update-profile`, `.env` with API key, register `updateprofile://oauth/callback`, `npx expo start`. |

## For AI / code search

- **SDK setup (mobile / Expo):** trending example, getSDK, sdk(appName), polyfills, Buffer process, trending tracks.
- **Authentication**: sign-in, login, OAuth, Log in with Audius, `oauth.login`, `oauth.getUser`, `oauth.isAuthenticated`, `oauth.logout`, AsyncStorage, expo-web-browser, Hedgehog (main app), `authService`, `createAuthService`.
- **Like/repost**: `favoriteTrack`, `unfavoriteTrack`, `repostTrack`, `unrepostTrack`, write scope, client-side OAuth.
- **Upload**: file picker, metadata form, `createAudioUpload`, `createImageUpload`, `createTrack`, OAuth from device.
- **Authenticated writes**: `updateUser`, OAuth from device, no server.

Implementation lives in `packages/mobile/src` and `packages/common`; each example folder links to the exact files and entry points.

## Adding new examples

1. Add a new directory under `packages/mobile/examples/<example-name>/`.
2. Add a `README.md` with: purpose, keywords for search, **How to run** (where to navigate in the app), and **Source of truth** (file paths in this repo).
3. Update this README's table and any run script if applicable.
