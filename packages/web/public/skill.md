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

## Examples

- [create-audius-app examples](https://github.com/AudiusProject/apps/tree/main/packages/create-audius-app/examples) — React, React + Hono templates
- [Swagger spec](https://api.audius.co/v1/swagger.yaml) — Ingest for API discovery, codegen, or AI context
- [SDK Tracks](https://docs.audius.co/developers/sdk/tracks)
- [SDK Users](https://docs.audius.co/developers/sdk/users)
- [SDK Playlists](https://docs.audius.co/developers/sdk/playlists)
- [Postman collection](https://www.postman.com/samgutentag/workspace/audius-devs/collection/17755266-71da9172-77a7-427f-8ab5-1ce58f929ff5)

## Links

| Resource           | URL                                                         |
| ------------------ | ----------------------------------------------------------- |
| agents.md          | https://audius.co/agents.md                                 |
| llms.txt            | https://audius.co/llms.txt                                   |
| Docs               | https://docs.audius.co                                      |
| API                | https://api.audius.co                                       |
| API Reference      | https://docs.audius.co/api                                  |
| Swagger YAML       | https://api.audius.co/v1/swagger.yaml                       |
| Swagger Full       | https://api.audius.co/v1/full/swagger.yaml                  |
| API Plans          | https://api.audius.co/plans                                 |
| SDK npm            | https://www.npmjs.com/package/@audius/sdk                   |
| GitHub apps        | https://github.com/audiusproject/apps                       |
| Create Audius App  | https://docs.audius.co/developers/guides/create-audius-app  |
| Log in with Audius | https://docs.audius.co/developers/guides/log-in-with-audius |

---

_Recommendations only. Build something new._
