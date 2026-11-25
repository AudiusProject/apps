# @audius/mcp

A remote [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude act for an Audius user, as a listener and as an artist. It speaks streamable HTTP, is built on `@audius/sdk`, and signs each user in with their own Audius account through Audius OAuth.

## Tools

| Tool | What it does | Access |
| :-- | :-- | :-- |
| `search_tracks` | Search tracks by text, genre and sort order | read-only |
| `search_users` | Search artists and listeners | read-only |
| `search_playlists` | Search public playlists | read-only |
| `get_trending_tracks` | Trending tracks, by genre and time range | read-only |
| `get_track` | One track by ID | read-only |
| `get_user` | One profile by ID or handle | read-only |
| `get_playlist` | One playlist by ID, with its tracks | read-only |
| `get_my_favorites` | The signed-in user's favorite tracks | read-only |
| `get_my_reposts` | The signed-in user's reposts | read-only |
| `get_my_tracks` | The signed-in user's uploads | read-only |
| `get_track_play_count` | Plays, favorites, reposts and comments for a track | read-only |
| `get_my_followers` | The signed-in user's followers | read-only |
| `get_top_fans` | Top supporters, ranked by $AUDIO tipped | read-only |
| `create_playlist` | Create a playlist | write |
| `add_track_to_playlist` | Append a track to an owned playlist | write |
| `favorite_track` | Favorite a track | write |
| `repost_track` | Repost a track | write |
| `upload_track` | Upload a track from a public `https` audio URL | write |
| `remove_track_from_playlist` | Remove a track from an owned playlist | write, destructive |
| `update_track_metadata` | Overwrite title, description, genre, mood or tags | write, destructive |

Every tool has a `title`. Read-only tools set `readOnlyHint: true`; write tools set `readOnlyHint: false` and an explicit `destructiveHint`.

## Local setup

1. Create a developer app at [audius.co/settings](https://audius.co/settings) → Developer Apps and copy its API key.
2. On the same page, register the redirect URI `http://localhost:3333/callback`.
3. From the repo root:

```bash
npm install
npx turbo run build --filter=@audius/sdk
cp packages/audius-mcp/.env.example packages/audius-mcp/.env
```

4. Put the API key in `packages/audius-mcp/.env`, then start the server:

```bash
npm run dev -w @audius/mcp
```

5. Add it to Claude Code and sign in when the browser opens:

```bash
claude mcp add --transport http audius http://localhost:3333/mcp
```

| Variable | Default | Purpose |
| :-- | :-- | :-- |
| `AUDIUS_API_KEY` | required | API key of the Audius developer app |
| `PUBLIC_URL` | `http://localhost:$PORT` | Origin clients reach the server on. Must be `https` unless it is localhost |
| `PORT` | `3333` | Port to listen on |
| `AUDIUS_ENVIRONMENT` | `production` | `development` targets a local protocol stack |
| `MAX_UPLOAD_MB` | `100` | Largest audio file `upload_track` will fetch |

`npm run test`, `npm run lint` and `npm run typecheck` run inside the package. The tests drive the whole OAuth flow and every tool over HTTP against a fake Audius session, so they need no API key.

### Using it from claude.ai or Claude Desktop

Those clients connect from Anthropic's servers, so the server needs a public `https` URL. For a quick test, tunnel the local server and restart it with the tunnel origin:

```bash
cloudflared tunnel --url http://localhost:3333
```

Set `PUBLIC_URL` to the `https://….trycloudflare.com` origin it prints, register `<PUBLIC_URL>/callback` as a redirect URI on the Audius developer app, then add `<PUBLIC_URL>/mcp` under Settings → Connectors → Add custom connector.

## Auth flow

The server is an OAuth 2.1 authorization server for MCP clients and an OAuth client of Audius. MCP clients never see Audius tokens.

1. The client calls `/mcp` without a token and gets `401` with a pointer to `/.well-known/oauth-protected-resource/mcp`. From there it discovers `/.well-known/oauth-authorization-server`, registers itself at `/register`, and sends the user to `/authorize` with a PKCE challenge.
2. `/authorize` shows a consent page naming the client and where it will redirect. Because any client may register, this page is what stops a stranger's client from silently borrowing the Audius approval.
3. Approving posts to `/auth`, which starts Audius OAuth through `sdk.oauth.login()` (authorization code + PKCE, `write` scope) and redirects to the Audius consent screen.
4. Audius redirects to `/callback`. The server finishes with `sdk.oauth.handleRedirect()`, reads the profile with `sdk.oauth.getUser()`, and redirects back to the client with a one-time code.
5. The client exchanges the code at `/token` for an access token (1 hour) and a rotating refresh token (30 days). `/revoke` ends the grant and logs out of Audius.

Each grant owns one SDK instance holding that user's Audius tokens in memory, and the SDK refreshes them on its own. Each MCP session is bound to the grant that opened it; a request carrying another user's token for that session is refused.

State lives in memory. Restarting the server signs everyone out and clients must reconnect, and running more than one instance needs a shared store behind `AudiusOAuthProvider` first.

## Deploying

The `Dockerfile` builds from the repo root and runs on any host that gives a container a public `https` URL (Railway, Fly.io, Render):

```bash
docker build -f packages/audius-mcp/Dockerfile -t audius-mcp .
```

Set `AUDIUS_API_KEY` and `PUBLIC_URL`, register `<PUBLIC_URL>/callback` on the Audius developer app, and run a single instance. `/health` is available for health checks.

## Claude connector directory submission

Submit at [claude.ai/directory/manage](https://claude.ai/directory/manage) → Submit new → MCP connector. Requirements are described in the [submission guide](https://claude.com/docs/connectors/building/submission) and the [directory policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy).

| Field | Value |
| :-- | :-- |
| Server name | Audius |
| URL | `https://<production host>/mcp` |
| One-liner | Search Audius, manage your library and playlists, and manage your own tracks. |
| Description | Lets Claude act for an Audius user. Listeners can search tracks, artists and playlists, browse trending, review favorites and reposts, favorite and repost tracks, and build playlists. Artists can review their uploads, stats, followers and top supporters, edit track details, and upload new tracks. |
| Categories | Music / entertainment |
| Transport | Streamable HTTP |
| Auth type | OAuth 2.1, authorization code with PKCE (S256), dynamic client registration, rotating refresh tokens |
| Reads / writes | Both |
| API ownership | First-party: the server calls the Audius API |
| Icon | Audius logo, `packages/harmony/src/assets/icons/AudiusLogo.svg` |
| Documentation URL | Link to this README or a docs.audius.co page |
| Privacy policy URL | https://audius.co/legal/privacy-policy |
| Support contact | To be supplied |
| Example prompts | At least three, for example: "Find trending electronic tracks this week and make a playlist of the top ten", "How are my tracks doing? Show plays, favorites and reposts", "Add the newest track by @handle to my Road Trip playlist" |
| Test account | An Audius account with a few uploads, favorites and a playlist, shared with reviewers outside the form |

Before submitting:

- Deploy to a stable production host and register its `/callback` on a production Audius developer app.
- Claude's OAuth callback is `https://claude.ai/api/mcp/auth_callback`. Clients register their own redirect URIs, so there is nothing to allowlist in this server. If the host sits behind a firewall, allow Anthropic's range `160.79.104.0/21`.
- Run every tool once from Claude with the test account; the form asks you to confirm this.
- Replace the in-memory store so a deploy does not sign users out.
- Confirm `upload_track` with the directory team. It fetches a URL the user supplies rather than a file from the conversation, and the policy restricts connectors that read user uploads or generate media. It does neither, but it is the tool most likely to draw questions.
