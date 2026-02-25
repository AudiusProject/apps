# Hello World: Trending Tracks

Minimal **Expo** app that renders **trending tracks** from Audius. Use this as a reference for:

- **SDK setup** in React Native / Expo (singleton, polyfills)
- **Fetching trending** via `sdk.tracks.getTrendingTracks()`
- **React Query** for caching and loading state

Setup mirrors [mobile-devkit](https://github.com/AudiusProject/mobile-devkit) (template-expo, examples-expo): polyfills in `index.js`, singleton SDK in `src/sdk.ts`, and a small UI that lists tracks.

## How to run

This example is **standalone** (not in the repo workspaces) so the main mobile app’s Metro won’t try to load it.

1. From the **apps repo root**, install and build the SDK if needed:
   ```bash
   npm install
   npm run build -w @audius/sdk
   ```

2. Install the example’s dependencies and start Expo (from repo root or from the example dir):
   ```bash
   cd packages/mobile/examples/hello-world-trending
   npm install
   npx expo start
   ```

   Or from repo root: `npm run mobile:example:hello-world` (run `npm install` in the example dir first).

3. Press `i` for iOS simulator or `a` for Android emulator (or scan the QR code with Expo Go).

**Note:** The example uses the local SDK via `file:../../../sdk`. If the SDK native build is missing, run `npm run build -w @audius/sdk` from repo root.

## Project layout

| File | Purpose |
|------|--------|
| `index.js` | Entry: polyfills (Buffer, process, events, etc.) **before** any SDK import, then register App. Required for @audius/sdk in RN. |
| `src/sdk.ts` | Singleton `getSDK()` — creates `sdk({ appName: 'AudiusMobileExample' })`. Single place to configure endpoints or options. |
| `src/hooks/useTrendingTracks.ts` | React Query hook that calls `getSDK().tracks.getTrendingTracks({ limit, offset, time })`. |
| `App.tsx` | Renders trending list (or loading/error). Wraps app in `QueryClientProvider`. |

## Keywords (for search / AI)

SDK setup, Expo, React Native, trending tracks, getTrendingTracks, Audius SDK, mobile example, polyfills, Buffer process events, singleton SDK, React Query.

## Source of truth (implementation)

- **SDK factory:** `packages/sdk/src/sdk/sdk.ts` — `sdk(config)` with `appName` (and optional `services`, `apiKey`, etc.).
- **Tracks API:** `packages/sdk/src/sdk/api/tracks/TracksApi.ts` (extends generated) and `packages/sdk/src/sdk/api/generated/default/apis/TracksApi.ts` — `getTrendingTracks(params)`.
- **Devkit reference:** [mobile-devkit/apps/template-expo](https://github.com/AudiusProject/mobile-devkit/tree/main/apps/template-expo), [mobile-devkit/apps/examples-expo](https://github.com/AudiusProject/mobile-devkit/tree/main/apps/examples-expo) for Expo + polyfills + SDK usage.
