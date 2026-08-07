---
'@audius/sdk': minor
---

Sign preview generation requests. `Storage.generatePreview` accepts a `userId` and, when a wallet client is configured, signs the request with the same EIP-712 payload audio uploads use. Storage nodes attest the resulting cid on chain so it can be named as a track's `preview_cid`, and they only do so for a user who already owns the source audio. Requests without a wallet or user id still succeed unsigned; the preview simply never earns a claim.
