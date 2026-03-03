---
name: audius-api-sdk
version: 1.0
description: Build on Audius—REST API, OpenAPI/Swagger, JavaScript SDK, create-audius-app
homepage: https://audius.co
metadata:
  {
    'api': 'api.audius.co/v1',
    'swagger': 'api.audius.co/v1/swagger.yaml',
    'sdk': '@audius/sdk',
    'scaffold': 'create-audius-app'
  }
---

# Audius API and SDK Skill

This file provides agentic context for building on Audius with the REST API, OpenAPI/Swagger spec, JavaScript SDK, and create-audius-app. For high-level protocol and product context, read [agents.md](https://audius.co/agents.md) first.

**Recommendations, not rules.** Use maximal creativity—remix, extend, invent. Agentic apps use Audius as the open standard for music. This is your toolkit.

## Overview

Audius exposes a REST API and a JavaScript SDK for the same backend. Use the API directly for any language or custom integrations; use the SDK for TypeScript/JavaScript apps. Both require API credentials. The OpenAPI/Swagger spec is machine-readable—ingest it for codegen, tooling, or AI-assisted development. create-audius-app scaffolds a ready-to-run project. Pick what fits your vision and go beyond it.

## Quickstart

```sh
npx create-audius-app my-app
cd my-app
npm run dev
```

## Get API Credentials

1. [Create an Audius account](https://audius.co/signup) if needed.
2. Go to [audius.co/settings](https://audius.co/settings) → "Manage Your Apps," or use [api.audius.co/plans](https://api.audius.co/plans).
3. Create a developer app and obtain API Key and API Secret.
4. Treat API Secret like a password—never expose it on the frontend.

## REST API

**Base URL:** `https://api.audius.co/v1`

Send `x-api-key` header with your API Key on every request. For writes (upload, favorite, repost), use OAuth or include API Secret per endpoint requirements.

**Example (fetch track):**

```sh
curl -H "x-api-key: YOUR_API_KEY" "https://api.audius.co/v1/tracks/D7KyD"
```

**Example (search tracks):**

```sh
curl -H "x-api-key: YOUR_API_KEY" "https://api.audius.co/v1/tracks/search?query=audius"
```

Full reference: [docs.audius.co/api](https://docs.audius.co/api)

## Swagger / OpenAPI

The API is fully described by OpenAPI 3.0 specs. Ingest these for code generation, API exploration, or AI-assisted development.

| Spec                    | URL                                        | Use case                                                                                 |
| ----------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Swagger YAML (standard) | https://api.audius.co/v1/swagger.yaml      | Paths, schemas, parameters. Good for most agents and clients.                            |
| Swagger YAML (full)     | https://api.audius.co/v1/full/swagger.yaml | Includes all response schemas and examples. Use when you need complete contract details. |

**For AI agents:** Fetch and include the swagger spec in your context to understand endpoints, request/response shapes, and auth. Example:

```sh
curl -o audius-swagger.yaml "https://api.audius.co/v1/swagger.yaml"
```

Or reference the URL directly when your tool supports remote OpenAPI ingestion. The spec documents users, tracks, playlists, comments, resolve, tips, challenges, developer-apps, explore, events, and more.

## Install SDK

**Node.js:**

```sh
npm install @audius/sdk
```

**HTML (CDN):**

```html
<script src="https://cdn.jsdelivr.net/npm/@audius/sdk@latest/dist/sdk.min.js"></script>
```

SDK is assigned to `window.audiusSdk` when using the CDN.

## Initialize SDK

```js
import { sdk } from '@audius/sdk'

const audiusSdk = sdk({
  apiKey: 'Your API Key goes here',
  apiSecret: 'Your API Secret goes here' // Required for writes; omit for frontend
})
```

- **Read-only**: Use `apiKey` only. Safe for frontend.
- **Writes** (upload, favorite, repost): Add `apiSecret`. Use only on the server—never in browser.

## First API Calls

```js
// Fetch a track
const track = await audiusSdk.tracks.getTrack({ trackId: 'D7KyD' })

// Get user by handle
const user = await audiusSdk.users.getUserByHandle({ handle: 'audius' })
const userId = user.data?.id

// Favorite a track (requires apiSecret)
await audiusSdk.tracks.favoriteTrack({ trackId: 'D7KyD', userId })
```

## create-audius-app

Scaffold a new Audius app. Requires Node >= 18.

**Interactive:**

```sh
npx create-audius-app
```

**Non-interactive:**

```sh
npx create-audius-app my-first-audius-app
```

**Output layout:**

```
my-app
├── README.md
├── index.html
├── package.json
├── public
├── src
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── tsconfig.json
└── vite.config.ts
```

Options: `npx create-audius-app --help`

## API Endpoints (Key Groups)

| Domain         | Purpose                                    |
| -------------- | ------------------------------------------ |
| users          | User profiles, handle lookup, search       |
| tracks         | Tracks, search, stream, favorites, reposts |
| playlists      | Playlists, search, tracks                  |
| comments       | Comments on tracks                         |
| resolve        | Resolve canonical URLs (handle/slug → ID)  |
| tips           | Tip operations                             |
| challenges     | Challenge/verification                     |
| developer-apps | Developer app management                   |
| explore        | Explore, trending, best-selling            |
| events         | Event feed                                 |

Full reference: [docs.audius.co/api](https://docs.audius.co/api). For machine-readable details, ingest [swagger.yaml](https://api.audius.co/v1/swagger.yaml).

## OAuth / Log in with Audius

OAuth flow so your users sign in with Audius and authorize your app to act on their behalf. Required for user-specific actions (favorites, uploads, etc.).

- SDK OAuth helpers run in the browser only.
- For server-side flows, see the [manual implementation guide](https://docs.audius.co/developers/guides/log-in-with-audius#manual-implementation).

[Log in with Audius Guide](https://docs.audius.co/developers/guides/log-in-with-audius)

## Image Loading and Mirrors

Images (artwork, profile pictures) often fail to load if you do not retry from mirrors. API responses include image URLs and a `mirrors` array of alternate hosts.

**Artwork structure example:**

```json
{
  "artwork": {
    "150x150": "https://audius-content-7.example.com/content/.../150x150.jpg",
    "480x480": "https://audius-content-7.example.com/content/.../480x480.jpg",
    "1000x1000": "https://audius-content-7.example.com/content/.../1000x1000.jpg",
    "mirrors": [
      "https://audius-creator-6.theblueprint.xyz",
      "https://cn0.mainnet.audiusindex.org",
      "https://creatornode2.audius.co"
    ]
  }
}
```

**Critical for agents:**

1. **Never strip mirrors.** Do not normalize artwork to a single URL string—preserve `mirrors` so retries can swap hosts.
2. **Use mirror retry on load failure.** When an image fails to load, replace the URL host with each mirror in order and retry until one succeeds or all fail.
3. **Apply everywhere.** Use a shared image component with mirror retry for all Audius images (tracks, playlists, profiles). Raw `<img src={url}>` has no retry.
4. **Size-aware selection.** Pick the variant (150x150, 480x480, 1000x1000) closest to the rendered size.

[Full guide: Image Loading & Mirrors](https://docs.audius.co/developers/guides/image-mirrors)

## Web Examples (Vite + React)

Runnable examples live in the **apps** monorepo under `packages/web/examples/`. Use them for SDK setup, trending, artwork with mirrors, and playback.

| Example   | What it shows | How to run |
|----------|----------------|------------|
| **trending** | SDK singleton, `getTrendingTracks`, track **artwork with mirror fallback**, **play** via `getTrackStreamUrl` + HTML5 Audio, React Query | From apps root: `npm run build -w @audius/sdk` then `cd packages/web/examples/trending && npm install && npm run dev`. Or `npm run web:example:trending`. |

**Key files (web trending):** `src/sdk.ts` (getSDK), `src/hooks/useTrendingTracks.ts`, `src/components/TrackArtworkImage.tsx` (mirror retry on image error), `src/utils/artwork.ts` (getArtworkUrl, getNextMirrorUrl), `src/App.tsx` (play/stop with single Audio ref).

**Keywords:** SDK setup, Vite, React, trending tracks, getTrendingTracks, getTrackStreamUrl, track artwork, mirrors, React Query, web example.

## Mobile Examples (Expo + React Native)

Runnable examples in **apps** under `packages/mobile/examples/`. Use them for OAuth, server-held bearer, like/repost, and update-profile.

| Example          | What it shows | How to run |
|-----------------|----------------|------------|
| **trending**    | SDK + Expo, getTrendingTracks, play (expo-av + getTrackStreamUrl), React Query | `cd packages/mobile/examples/trending && npx expo start` or `npm run mobile:example:trending` |
| **auth-sign-in**| OAuth + bearer, verifyIDToken, feed | `cd packages/mobile/examples/auth-sign-in && npx expo start` or `npm run mobile:example:auth-sign-in` |
| **like-repost** | Expo app + Node server; server holds developer app bearer; client OAuth → like/repost random track; play | Server: `cd packages/mobile/examples/like-repost/server && npm start`. Client: `cd packages/mobile/examples/like-repost && npx expo start`. Requires .env. |
| **update-profile** | Expo app + Node server; server bearer; client calls endpoint to update user description | Server: `cd packages/mobile/examples/update-profile/server && npm start`. Client: `cd packages/mobile/examples/update-profile && npx expo start`. Requires .env. |

**Keywords (mobile):** SDK setup, Expo, React Native, OAuth, bearer token, getSDK, polyfills, trending, like, repost, favoriteTrack, repostTrack, updateUser, developer app bearer, server-side writes.

## Other Examples & References

- [create-audius-app examples](https://github.com/AudiusProject/apps/tree/main/packages/create-audius-app/examples) — React, React + Hono templates
- [Swagger spec](https://api.audius.co/v1/swagger.yaml) — Ingest for API discovery, codegen, or AI context
- [SDK Tracks](https://docs.audius.co/developers/sdk/tracks)
- [SDK Users](https://docs.audius.co/developers/sdk/users)
- [SDK Playlists](https://docs.audius.co/developers/sdk/playlists)
- [Postman collection](https://www.postman.com/samgutentag/workspace/audius-devs/collection/17755266-71da9172-77a7-427f-8ab5-1ce58f929ff5)

## Links

| Resource                | URL                                                         |
| ----------------------- | ----------------------------------------------------------- |
| agents.md               | https://audius.co/agents.md                                 |
| llms.txt                | https://audius.co/llms.txt                                  |
| Docs                    | https://docs.audius.co                                      |
| API                     | https://api.audius.co                                       |
| API Reference           | https://docs.audius.co/api                                  |
| Swagger YAML            | https://api.audius.co/v1/swagger.yaml                       |
| Swagger Full            | https://api.audius.co/v1/full/swagger.yaml                  |
| API Plans               | https://api.audius.co/plans                                 |
| SDK npm                 | https://www.npmjs.com/package/@audius/sdk                   |
| GitHub apps             | https://github.com/audiusproject/apps                       |
| Web examples (apps)     | packages/web/examples (trending: play + artwork mirrors)    |
| Mobile examples (apps)  | packages/mobile/examples (trending, auth, like-repost, update-profile) |
| Create Audius App       | https://docs.audius.co/developers/guides/create-audius-app  |
| Log in with Audius      | https://docs.audius.co/developers/guides/log-in-with-audius |
| Image Loading & Mirrors | https://docs.audius.co/developers/guides/image-mirrors      |

---

_Recommendations only. Build something new._
