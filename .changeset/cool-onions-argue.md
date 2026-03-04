---
'@audius/sdk': patch
---

Fix create/upload/update playlist in legacy path

- `publishTracks` returns string track IDs, which were being incorrectly parsed as though they were numbers that needed converting. This was changed behavior from recent SDK changes made to match the POST endpoints as this was working previously
- `createPlaylist` wasn't equipped to handle using a preset `playlistId` like our client expects, rejecting calls that had `playlistId` already set in the metadata (which would happen on our creation of playlists from scratch).
- `createPlaylistInternal` was being passed parsed parameters in the `createPlaylist` case, and unparsed in the `uploadPlaylist` case, and used types that made it hard to squeeze both callsites in. This was resulting in incorrectly setting some IDs to hash IDs (eg in `playlistContents`) and was uncovered when fixing the playlistId bug above
- `updatePlaylist` had incorrect schema still referencing `coverArtCid` instead of `playlistImageSizesMultihash`, blocking any playlist updates that included an image update
