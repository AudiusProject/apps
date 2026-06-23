---
'@audius/sdk': patch
---

Fix `AlbumsApi.createAlbum` when callers provide an `albumId`, ensuring the id is passed through as playlist create metadata and blank album creation sends explicit empty playlist contents.
