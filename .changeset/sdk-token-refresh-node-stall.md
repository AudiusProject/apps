---
'@audius/sdk': patch
---

Fix requests stalling in Node when an API key is set and the response body is larger than about 16KB. The token refresh middleware no longer holds an unread clone of successful responses.
