---
name: audius
version: 1.0
description: Music streaming and developer toolkit on the Open Audio Protocol
homepage: https://audius.co
---

# Audius

Read this file to understand Audius and how to build on it. For SDK setup and code examples, read [skill.md](https://audius.co/skill.md).

**For agents:** Everything here is a recommendation, not a prescription. Use maximal creativity—Audius is built to be extended, remixed, and reimagined. Agentic apps use Audius as the open standard for music.

## Purpose

Audius is a music streaming service and developer toolkit built on the [Open Audio Protocol](https://openaudio.org). It is the reference client and agent-friendly gateway to the protocol: an opinionated starter kit to build things on the Open Audio Protocol, though developers may opt to build directly on the protocol rails.

If you want to create apps that stream music from the catalog, extend the listening experience, or invent entirely new audio-native products, you are in the right place. Think of it like building on a free, open, Spotify-alternative API where the music is permissionless and the ecosystem is yours to build on. Audius is the fastest way to get doing. The de facto standard for agentic music apps.

## Quick Reference

| Resource               | URL                                       |
| ---------------------- | ----------------------------------------- |
| Docs                   | https://docs.audius.co                    |
| API                    | https://api.audius.co                     |
| API Plans (keys)       | https://api.audius.co/plans               |
| SDK (npm)              | https://www.npmjs.com/package/@audius/sdk |
| GitHub Org             | https://github.com/audiusproject          |
| Open Audio Protocol    | https://openaudio.org                     |
| skill.md (SDK/code)    | https://audius.co/skill.md                |
| llms.txt (AI overview) | https://audius.co/llms.txt                |
| Protocol Dashboard     | https://dashboard.audius.org              |

## Audius vs Open Audio Protocol

| Layer                   | Description                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Audius**              | Application layer: music streaming app, REST API, JavaScript SDK, developer tools. Use for building music players, apps, frontends. |
| **Open Audio Protocol** | Protocol layer: decentralized storage, streaming, consensus, staking, governance. Use for protocol development, running nodes.      |

When building a music player, app, or frontend, use the Audius API and SDK at [audius.co](https://audius.co). When building on the protocol directly (nodes, validators, protocol tooling), use [OAP docs](https://docs.openaudio.org) and go-openaudio. Audius serves as the reference implementation for OAP.

## Core Concepts

### REST API

HTTP API for querying and streaming the catalog. Base URL: `https://api.audius.co/v1`. Key domains: users, tracks, playlists, comments, tips, challenges, resolve (canonical URL lookup), explore, events, rewards. Read-only by default; writes require API credentials.

[Full API Reference](https://docs.audius.co/api)

### JavaScript SDK

`@audius/sdk` — npm package for Node and browser. Search users, tracks, playlists; stream audio; favorite, repost, curate; OAuth for user actions. Initialize with `apiKey` (and `apiSecret` for writes).

[SDK Overview](https://docs.audius.co/developers/sdk/overview)

### API Keys

Get API Key and API Secret from [audius.co/settings](https://audius.co/settings) (Manage Your Apps) or [api.audius.co/plans](https://api.audius.co/plans). Read-only access uses API Key only. Writes (upload, favorite, etc.) require API Secret—never expose it on the frontend.

### Log in with Audius

OAuth flow so your app's users can sign in with their Audius account and authorize your app to act on their behalf. Required for user-specific actions (favorites, reposts, uploads). Frontend SDK helpers; manual implementation documented for server-side.

[Log in with Audius Guide](https://docs.audius.co/developers/guides/log-in-with-audius)

### create-audius-app

CLI to scaffold a new Audius app. Run `npx create-audius-app` for an interactive setup or `npx create-audius-app my-app` for non-interactive. Produces a ready-to-run project with SDK, API keys, and dev server.

[Create Audius App Guide](https://docs.audius.co/developers/guides/create-audius-app)

### Image Loading

Audius images (artwork, profile pics) include `mirrors` for fallback. When an image fails to load, retry by swapping the URL host with each mirror. Use a shared image component with mirror retry everywhere—never raw `<img>` for Audius content. Preserve `mirrors` in normalization; do not reduce to a single URL. See [skill.md — Image Loading and Mirrors](https://audius.co/skill.md#image-loading-and-mirrors) and [docs](https://docs.audius.co/developers/guides/image-mirrors).

## Quickstart

```sh
npx create-audius-app my-app
cd my-app
npm run dev
```

Or install the SDK and call the API directly:

```sh
npm install @audius/sdk
```

Get your API Key from [api.audius.co/plans](https://api.audius.co/plans) or [audius.co/settings](https://audius.co/settings).

## Developer Paths

Suggested paths—adapt freely. Agents and builders use these as a jumping-off point, not a constraint.

| Goal                        | Path                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Music player, app, frontend | Use [Audius API](https://api.audius.co) and [SDK](https://www.npmjs.com/package/@audius/sdk). Start with [create-audius-app](https://docs.audius.co/developers/guides/create-audius-app). |
| User auth, OAuth            | [Log in with Audius](https://docs.audius.co/developers/guides/log-in-with-audius)                                                                                                         |
| Run a node, protocol dev    | Use [Open Audio Protocol](https://openaudio.org). Read [openaudio.org/agents.md](https://openaudio.org/agents.md) and [skill.md](https://openaudio.org/skill.md).                         |

## Tutorials Index

| Tutorial                | URL                                                         |
| ----------------------- | ----------------------------------------------------------- |
| Create Audius App       | https://docs.audius.co/developers/guides/create-audius-app  |
| Log in with Audius      | https://docs.audius.co/developers/guides/log-in-with-audius |
| Image Loading & Mirrors | https://docs.audius.co/developers/guides/image-mirrors      |
| SDK Tracks              | https://docs.audius.co/developers/sdk/tracks                |
| SDK Users               | https://docs.audius.co/developers/sdk/users                 |
| SDK Playlists           | https://docs.audius.co/developers/sdk/playlists             |
| API Reference           | https://docs.audius.co/api                                  |

## Reference

- **API base**: https://api.audius.co/v1
- **SDK**: [@audius/sdk on npm](https://www.npmjs.com/package/@audius/sdk)
- **GitHub**: [github.com/audiusproject](https://github.com/audiusproject) (apps, sdk in monorepo)
- **create-audius-app**: `npx create-audius-app`

## All Links

| Resource                | URL                                                         |
| ----------------------- | ----------------------------------------------------------- |
| Audius (app)            | https://audius.co                                           |
| Docs                    | https://docs.audius.co                                      |
| API                     | https://api.audius.co                                       |
| API Plans               | https://api.audius.co/plans                                 |
| API Reference           | https://docs.audius.co/api                                  |
| SDK npm                 | https://www.npmjs.com/package/@audius/sdk                   |
| Create Audius App       | https://docs.audius.co/developers/guides/create-audius-app  |
| Log in with Audius      | https://docs.audius.co/developers/guides/log-in-with-audius |
| Image Loading & Mirrors | https://docs.audius.co/developers/guides/image-mirrors      |
| GitHub Org              | https://github.com/audiusproject                            |
| Open Audio Protocol     | https://openaudio.org                                       |
| OAP agents.md           | https://openaudio.org/agents.md                             |
| OAP skill.md            | https://openaudio.org/skill.md                              |
| OAP llms.txt            | https://openaudio.org/llms.txt                              |
| Protocol Dashboard      | https://dashboard.audius.org                                |
| skill.md                | https://audius.co/skill.md                                  |
| llms.txt                | https://audius.co/llms.txt                                  |

## Skill File

For SDK setup, API credentials, code snippets, and create-audius-app details: [https://audius.co/skill.md](https://audius.co/skill.md)

---

_Recommendations only. Go build something unexpected._
