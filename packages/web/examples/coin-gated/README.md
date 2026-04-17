# Coin-Gated Tracks (Web)

Vite + React app that lets users browse and stream **coin-gated tracks** on Audius. Use this as a reference for:

- **SDK setup** in a browser / Vite app (singleton, node polyfills)
- **Coin lookup** via `sdk.coins.getCoinByTicker()`
- **Coin-gated track listing** via `sdk.users.getTracksByUser()` with `gateCondition: ['token']`
- **OAuth sign-in** (PKCE popup flow) for authenticated access checks
- **Solana wallet connection** via Phantom (`sdk.solanaWallet.auth()`)
- **Streaming gated tracks** via `sdk.tracks.streamTrack()`
- **Coin balance** via `sdk.users.getUserCoin()` / `sdk.wallets.getWalletCoins()`

## How to run

1. From the **apps repo root**, install and build the SDK if needed:

   ```bash
   npm install
   npm run build -w @audius/sdk
   ```

2. Configure your API key:

   ```bash
   cd packages/web/examples/coin-gated
   cp .env .env.local
   # Edit .env.local and set VITE_AUDIUS_API_KEY to your developer app API key
   # Get one at audius.co/settings → Developer Apps
   ```

3. Install and start:

   ```bash
   npm install
   npm run dev
   ```

4. Open `http://localhost:5178`.

## Environment variables

| Variable                  | Required | Description                                                                    |
| :------------------------ | :------- | :----------------------------------------------------------------------------- |
| `VITE_AUDIUS_API_KEY`     | Yes      | Developer app API key (enables OAuth for gated access checks)                  |
| `VITE_AUDIUS_ENVIRONMENT` | No       | `development` to target local stack, `production` (default) for public network |
| `VITE_DEFAULT_TICKER`     | No       | Default coin ticker to browse on load (defaults to `YAK`)                      |

## Project layout

| File               | Purpose                                                                                  |
| :----------------- | :--------------------------------------------------------------------------------------- |
| `src/App.tsx`      | Main UI — ticker search, OAuth + wallet sign-in, coin info, gated track list, streaming. |
| `src/sdk.ts`       | Singleton `getSDK()` with `apiKey`, `redirectUri`, and `environment`.                    |
| `src/config.ts`    | Reads env vars (`VITE_AUDIUS_API_KEY`, `VITE_AUDIUS_ENVIRONMENT`, `VITE_DEFAULT_TICKER`). |
| `vite.config.ts`   | React plugin + node polyfills (buffer, process) for SDK.                                 |

## Keywords (for search / AI)

Coin-gated, token-gated, fan club, Phantom wallet, Solana wallet, OAuth, PKCE, streaming, getCoinByTicker, getTracksByUser, streamTrack, getUserCoin, getWalletCoins, Audius SDK, web example, React Query.
