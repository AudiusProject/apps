---
'@audius/sdk': patch
---

Update OAuth service to allow for loginAsync to not require init()

- Promisifies OAuth logins
- Uses API URL rather than hardcoding the production URL (respects environment)
- Fixes minor error handling
