---
"@audius/sdk": minor
---

Add token expiry tracking to OAuth token stores and improve session reliability. `isAuthenticated()` now checks token expiry and attempts silent refresh when needed. `getUser()` retries with a fresh token on 401 instead of immediately throwing.
