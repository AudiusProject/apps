---
'@audius/sdk': minor
---

Support OAuth popups with redirect_uris

- Previously `OAuth` logins only listened for postMessage when explicitly set as the redirect_uri. This update makes the OAuth service to listen to messages from an explicit `redirect_uri` as well if `display: 'popup'`.
- Adds `getRedirectResult()` to `OAuth` to handle OAuth redirects. When called inside a popup, posts the message back to the opener. Otherwise, exchanges the authorization code for access/refresh tokens and returns the login result.
- Adds persistence to `OAuthTokenStore` by default, so that the user stays logged in across sessions/refreshes.
- Adds a getter `isAuthenticated` to `OAuth` for convenience.
