---
'@audius/sdk': patch
---

Add `allowedApiKeys` to `UploadTrackMetadataSchema` so it's preserved when uploading or updating tracks. Previously the strict schema stripped the field, which prevented the "Disallow Streaming via the API" setting from being saved.
