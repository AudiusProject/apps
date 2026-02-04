---
'@audius/sdk': major
---

Update track file uploads to use TUS protocol

- `sdk.tracks.uploadTrack()` parameters have changed:
  - `trackFile` is now `audioFile`
  - `coverArtFile` is now `imageFile`
  - `onProgress` now has the form `(type: 'audio' | 'image', progress: { loaded?: number, total?: number, transcode?: number }) => void`

Track uploads will now autoretry three times on failure/network disconnect, and resume if there were pending uploads in local storage.
