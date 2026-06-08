# Trending (Web)

Minimal Vite + React app that renders **trending tracks** from Audius. Use this as a reference for:

- **SDK setup** in a browser / Vite app (singleton, node polyfills)
- **Fetching trending** via `sdk.tracks.getTrendingTracks()`
- **Track artwork** with mirror fallback (try next CDN on image error)
- **Play** via `sdk.tracks.getTrackStreamUrl()` + HTML5 `Audio`
- **React Query** for caching and loading state

Mirrors the [mobile trending example](../../mobile/examples/trending/): same SDK usage and hook shape, with a simple list UI.

## How to run

1. From the **apps repo root**, install and build the SDK if needed:

   ```bash
   npm install
   npm run build -w @audius/sdk
   ```

2. Install the example's dependencies and start Vite:

   ```bash
   cd packages/web/examples/trending
   npm install
   npm run dev
   ```

   Or from repo root: `npm run web:example:trending` (run `npm install` in the example dir first).

3. Open the URL shown (default `http://localhost:5174`).

## Project layout

| File | Purpose |
|------|---------|
| `index.html` | Entry HTML; script loads `src/main.tsx`. |
| `src/main.tsx` | Mounts `App` into `#root`. |
| `src/sdk.ts` | Singleton `getSDK()` — `sdk({ appName: 'AudiusWebExample' })`. |
| `src/hooks/useTrendingTracks.ts` | React Query hook calling `getSDK().tracks.getTrendingTracks({ limit, offset, time })`. |
| `src/App.tsx` | Renders trending list with artwork, play button, loading/error. Wraps app in `QueryClientProvider`. |
| `src/components/TrackArtworkImage.tsx` | Track cover image with **mirror fallback**: on load error, tries `artwork.mirrors` by swapping host. |
| `src/utils/artwork.ts` | `getArtworkUrl(artwork, size)`, `getNextMirrorUrl(url, mirrors)` for CDN fallback. |
| `vite.config.ts` | React plugin + node polyfills (buffer, process) for SDK. |

## Keywords (for search / AI)

SDK setup, Vite, React, trending tracks, getTrendingTracks, Audius SDK, web example, node polyfills, singleton SDK, React Query.

## Source of truth (implementation)

- **SDK factory:** `packages/sdk/src/sdk/sdk.ts` — `sdk(config)` with `appName` (and optional `services`, `apiKey`, etc.).
- **Tracks API:** `packages/sdk` — `getTrendingTracks(params)`.
- **Mobile counterpart:** `packages/mobile/examples/trending/` — same pattern for Expo.
