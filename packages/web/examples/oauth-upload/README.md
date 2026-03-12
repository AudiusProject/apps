# oauth-upload

A serverless Audius track upload example using SDK + OAuth PKCE entirely in the browser. No backend server required.

## How it works

1. User clicks "Sign in with Audius" — `sdk.oauth.loginAsync({ scope: 'write' })` opens a popup, runs the PKCE flow, and stores the access token internally in the SDK's `tokenStore`.
2. User picks an audio file (and optional cover art), fills in title/genre/description.
3. On upload:
   - `sdk.uploads.createAudioUpload({ file })` uploads audio to a storage node → returns `trackCid`, `origFileCid`, `duration`, etc.
   - `sdk.uploads.createImageUpload({ file })` uploads cover art → returns `coverArtSizes` CID.
   - `sdk.tracks.createTrack({ userId, metadata })` registers the track on-chain, authenticated via the stored OAuth access token.

## Setup

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
