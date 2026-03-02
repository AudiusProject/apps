---
'@audius/sdk': major
---

Remove getPlaylistByHandleAndSlug in favor of getBulkPlaylists

- Removes `sdk.playlists.getPlaylistByHandleAndSlug()` in favor of calling `sdk.playlists.getBulkPlaylists({ permalink: ['/handle/playlist/playlist-name-slug'] })`
- Changes return values of `CommentsAPI` to match other APIs, removing `success` param.
