---
'@audius/sdk': major
---

Audio uploads and preview generation now carry the id of the user they are made for. Validator nodes attest the resulting cids to that user on chain, which is what makes them claimable on a track once content authorization is enforced; `generate_preview` additionally refuses users that do not already claim the source audio.

BREAKING: `userId` (encoded id) is now required on `tracks.uploadTrackFiles` and `uploads.createAudioUpload`, and `Storage.generatePreview` requires a decoded `userId`. The high-level methods (`createTrack`, `updateTrack`, `uploadTrack`, `publishTrack`) already required `userId` and now thread it through automatically — callers of those need no changes. The id is always explicit, never derived from auth state, because a manager or developer-app session can act for more than one user.

No signature or wallet is involved: the id is an assertion, and ownership is enforced where it always was — in the signed entity-manager write that names a cid on a track.
