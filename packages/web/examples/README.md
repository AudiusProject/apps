# Web Examples

Runnable examples for building Audius-style web features (Vite + React). Use these when implementing **SDK setup**, **trending/read APIs**, or similar capabilities so that AIs and developers can find reference implementations quickly.

## Available examples

| Example | Description | How to run |
|--------|-------------|------------|
| [trending](./trending/) | **Vite + React**: SDK setup + trending tracks (mirrors mobile trending example). | From repo root: `cd packages/web/examples/trending && npm install && npm run dev` or `npm run web:example:trending`. Build SDK first: `npm run build -w @audius/sdk`. |

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

SDK setup, Vite, React, trending tracks, getTrendingTracks, Audius SDK, web example, React Query.
