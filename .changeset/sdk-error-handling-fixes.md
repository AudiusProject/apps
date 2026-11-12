---
'@audius/sdk': patch
---

Fix several error-handling bugs:

- Uploads reject when transcode/resize polling fails instead of never settling, and aborting an upload stops status polling right away.
- The storage node selector reorders using the refreshed node list after an earlier node list fetch failed.
- The request signature middleware no longer attaches a previously cached signature after the wallet is gone (e.g. after logout) or signing fails.
- `SolanaRelayWalletAdapter.connect()` resets `connecting` when fetching the fee payer fails.
- `SolanaRelay.relay()` rethrows the original response error when the error body isn't JSON.
- `SolanaClient.buildTransaction()` rounds the percentile-based priority fee, which threw on fractional values.
- Chats: a failed public key fetch is no longer cached, and errors handling websocket events are logged instead of becoming unhandled rejections.
