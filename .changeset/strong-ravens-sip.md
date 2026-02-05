---
'@audius/sdk': major
---

Update track file uploads to use TUS protocol

- `sdk.tracks.uploadTrack()`, `sdk.tracks.updateTrack()`, `sdk.playlists.uploadPlaylist()`, `sdk.playlists.updatePlaylist()`, `sdk.albums.uploadAlbum()`, `sdk.albums.updateAlbum()`, parameters have changed:
  - `trackFile`/`trackFiles` is now `audioFile`/`audioFiles`
  - `coverArtFile` is now `imageFile`
  - `onProgress` for tracks, playlists, and albums uploads/updates now has the form `(progress: number, event: { key: 'audio' | 'image' | number, loaded?: number, total?: number, transcode?: number }) => void`, where `progress` is a number between 0 and 1 showing the overall progress, `key` is a reference to what's being uploaded (where numbers are the index of the audio file in the case of albums/playlists), `loaded`/`total` are the number of bytes uploaded and total bytes, respectively, and `transcode` is a number between 0-1 of the transcode progress, if applicable.

Audio file uploads will now autoretry three times on failure/network disconnect, and resume if there were pending uploads in local storage.
