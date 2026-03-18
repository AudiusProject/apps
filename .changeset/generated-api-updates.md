---
'@audius/sdk': minor
---

Generated API updates: track download counts, /me endpoint

- Added `TracksApi.getTrackDownloadCount()` and `getTrackDownloadCounts()` from swagger
- Added `UsersApi.getMe()` for the authenticated user endpoint
- Fixed generator script (`gen.js` → `gen.cjs`) for ESM compatibility — the SDK package uses `"type": "module"` which caused Node to treat `.js` files as ESM, breaking the `require()`-based generator
