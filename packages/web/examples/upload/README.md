# upload

A serverless Audius track upload example using SDK + OAuth PKCE entirely in the browser. No backend server required.

## How it works

1. User clicks "Sign in with Audius" — `sdk.oauth.login({ scope: 'write', display: 'popup' })` opens a popup and runs the PKCE flow. The `redirectUri` is set once in the SDK config (see `src/sdk.ts`).
2. The popup redirects to Audius, then back to `redirectUri` (this same app) with an authorization code in the URL.
3. On the callback page (inside the popup), `sdk.oauth.handleRedirect()` detects `window.opener`, forwards the authorization code back to the parent window via `postMessage`, and closes the popup.
4. The parent's `login()` promise resolves; call `sdk.oauth.getUser()` to retrieve the authenticated user's profile. The access token is stored internally in the SDK's `tokenStore`.
5. User picks an audio file (and optional cover art), fills in title/genre/description.
6. On upload:
   - `sdk.uploads.createAudioUpload({ file })` uploads audio to a storage node → returns `trackCid`, `origFileCid`, `duration`, etc.
   - `sdk.uploads.createImageUpload({ file })` uploads cover art → returns `coverArtSizes` CID.
   - `sdk.tracks.createTrack({ userId, metadata })` registers the track on-chain, authenticated via the stored OAuth access token.

## Setup

### 1. Register the redirect URI

In your developer app settings at **audius.co/settings → Developer Apps**, add the following redirect URI:

```
http://localhost:5177/
```

This is recommended so the OAuth server can validate the callback URL when the popup redirects back to this app. For production deployments, register your deployed URL instead (e.g. `https://yourapp.com`).

### 2. Configure and run

```bash
cp .env.example .env
# Edit .env and set VITE_AUDIUS_API_KEY to your developer app API key
# Get one at audius.co/settings → Developer Apps
npm install
npm run build -w @audius/sdk
npm run dev
```

## Running against local dev vs production

By default the example talks to the **production** Audius network. To point it
at a local protocol stack instead:

1. Start the local stack and expose its ports to the host:
   ```bash
   # from the repo root
   audius-compose up
   audius-compose connect
   ```
2. Set the environment variable in your `.env`:
   ```env
   VITE_AUDIUS_ENVIRONMENT=development
   ```
3. Start (or restart) the dev server:
   ```bash
   npm run dev
   ```

To switch back to production, remove or comment out the
`VITE_AUDIUS_ENVIRONMENT` line (or set it to `production`) and restart.

## Environment variables

| Variable                  | Required | Description                                                                    |
| :------------------------ | :------- | :----------------------------------------------------------------------------- |
| `VITE_AUDIUS_API_KEY`     | Yes      | Developer app API key (enables PKCE write scope)                               |
| `VITE_AUDIUS_ENVIRONMENT` | No       | `development` to target local stack, `production` (default) for public network |

## Key source files

| File            | Description                                                  |
| :-------------- | :----------------------------------------------------------- |
| `src/App.tsx`   | Main UI — OAuth sign-in, file pickers, upload + create logic |
| `src/sdk.ts`    | SDK singleton initialised with `apiKey`                      |
| `src/config.ts` | Reads `VITE_AUDIUS_API_KEY` from the environment             |
