# Coin-Gated Content (Web)

Vite + React app that lets users browse and consume **coin-gated content** on Audius — both streaming tracks and members-only fan-club text posts. Use this as a reference for:

- **SDK setup** in a browser / Vite app (singleton, node polyfills)
- **Coin lookup** via `sdk.coins.getCoinByTicker()`
- **Coin-gated track listing** via `sdk.users.getTracksByUser()` with `gateCondition: ['token']`
- **Coin-gated text posts** via `sdk.comments.getFanClubFeed({ mint, userId })` (filtered to `item_type: 'text_post'`)
- **OAuth sign-in** (PKCE popup flow) for authenticated access checks
- **Solana wallet connection** via Phantom (`sdk.solanaWallet.auth()`) — the SDK auto-injects `X-Solana-Wallet`/`X-Solana-Message`/`X-Solana-Signature` headers so the API can gate by holdings
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

## Verifying coin-gated text posts work via Solana wallet auth

The "Coin-Gated Text Posts" section calls `sdk.comments.getFanClubFeed({ mint, userId })` and shows whether each members-only post arrives decrypted (full message body) or tombstoned (locked).

To verify the wallet path end-to-end:

1. Browse a coin whose creator has at least one members-only fan-club text post (default `YAK`, override via `VITE_DEFAULT_TICKER`).
2. **Without** signing in or connecting a wallet (or with a wallet that holds none of the coin), members-only posts should show **Locked** with a placeholder body.
3. Click **Connect Solana Wallet** and approve the signature in Phantom. The connected wallet's `publicKey` is used to sign a one-shot `audius:solana-wallet:<timestamp>` message; the SDK middleware then attaches `X-Solana-Wallet` / `X-Solana-Message` / `X-Solana-Signature` to every subsequent request.
4. The post list refetches automatically (the React Query key includes the wallet pubkey). If the wallet holds the artist's coin, members-only posts now render with their full message body and an **Access granted** badge.
5. Disconnect the wallet — the credential is cleared (`sdk.solanaWallet.clearCredential()`) and gated posts return to **Locked**.

> Public posts (`isMembersOnly: false`) are always visible, regardless of auth state. Use them as a sanity check that the feed is loading.

## Keywords (for search / AI)

Coin-gated, token-gated, fan club, fan-club feed, text post, members-only, Phantom wallet, Solana wallet, OAuth, PKCE, streaming, getCoinByTicker, getTracksByUser, getFanClubFeed, streamTrack, getUserCoin, getWalletCoins, X-Solana-Wallet, Audius SDK, web example, React Query.
