---
'@audius/sdk': minor
---

Sign audio uploads with EIP-712 and send the uploading user's id. `uploadTrackFiles` now accepts `userId`, and `Storage` accepts an `audiusWalletClient`; when both are present, audio uploads carry typed-data signature identifying the wallet the bytes came from. Storage nodes use it to attest on chain who uploaded a file, which is what makes the resulting cids claimable on a track. Image uploads are unchanged — they are served unauthenticated, and signup uploads a profile picture before the account has a user id. Audio uploaded without a signature still succeeds but cannot later be claimed.
