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

Environment: copy `packages/mobile/.env.dev` if needed; the app runs against staging by default.

## Available examples

| Example | Description | How to run in the app |
|--------|-------------|------------------------|
| [trending](./trending/) | **Expo app**: SDK setup + trending tracks (code example) | From repo root: `cd packages/mobile/examples/trending && npx expo start` or `npm run mobile:example:trending` |
| [auth-sign-in](./auth-sign-in/) | **Expo app**: OAuth + bearer token (SDK). Main app: Hedgehog email/password. | OAuth example: `cd packages/mobile/examples/auth-sign-in && npx expo start` or `npm run mobile:example:auth-sign-in`. Main app: open app → sign-in. |
| [authenticated-writes](./authenticated-writes/) | **Expo app + Node server**: Server holds developer app bearer; client calls endpoint to update user description (e.g. bio). No client auth. | Run server: `cd packages/mobile/examples/authenticated-writes/server && npm install && npm start`. Run client: `cd packages/mobile/examples/authenticated-writes && npx expo start`. Requires .env (see example README). |

## For AI / code search

- **SDK setup (mobile / Expo):** trending example, getSDK, sdk(appName), polyfills, Buffer process, trending tracks.
- **Authentication**: sign-in, login, OAuth, bearer token, Hedgehog, identity service, `authService`, `createAuthService`, `sdk({ bearerToken })`, `oauth.login`.
- **Authenticated writes**: developer app bearer on server, `updateUser`, `sdk({ apiKey, bearerToken })`, update user description.

Implementation lives in `packages/mobile/src` and `packages/common`; each example folder links to the exact files and entry points.

## Adding new examples

1. Add a new directory under `packages/mobile/examples/<example-name>/`.
2. Add a `README.md` with: purpose, keywords for search, **How to run** (where to navigate in the app), and **Source of truth** (file paths in this repo).
3. Update this README's table and any run script if applicable.
