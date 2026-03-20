---
"@audius/sdk": patch
---

Fix PKCE OAuth access token not being sent with Bearer prefix, and fix `getUser()` calling the wrong endpoint (`/oauth/me` → `/me`)
