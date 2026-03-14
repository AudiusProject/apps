---
'@audius/sdk': major
---

OAuth: rewrite with PKCE, async login, and React Native support

The OAuth service has been fully reworked. It now uses the OAuth 2.0
Authorization Code Flow with PKCE. The implicit flow (Ethereum-signed JWT)
has been removed. Tokens are persisted across sessions by default.

`sdk.oauth` is now always defined — no null check or `!` assertion needed.

React Native / Expo is now supported out of the box. See the [React Native / Expo](#react-native--expo) section below.

## Breaking changes

### Removed APIs

| Removed                                          | Replacement                                        |
| ------------------------------------------------ | -------------------------------------------------- |
| `oauth.init({ successCallback, errorCallback })` | No replacement — call `login()` directly           |
| `oauth.renderButton(element, options)`           | No replacement — build your own sign-in button     |
| `LoginSuccessCallback` type                      | Use `login().then()` or `await login()`            |
| `LoginErrorCallback` type                        | Use `login().catch()` or try/catch `await login()` |
| `ButtonOptions` type                             | —                                                  |
| `LoginResult` type                               | Call `oauth.getUser()` after login instead         |
| `write_once` scope                               | Use `write` scope instead                          |
| `WriteOnceParams` type                           | —                                                  |

### Changed APIs

| API                      | Before                           | After                                         |
| ------------------------ | -------------------------------- | --------------------------------------------- |
| `login()`                | fire-and-forget, no `redirectUri` | `async`, requires `redirectUri`, returns `Promise<void>` |
| `hasRefreshToken`        | synchronous getter (`boolean`)   | `async` method returning `Promise<boolean>`   |

### Added APIs

| Added                          | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `handleRedirect(url?: string)` | Completes the OAuth flow from the redirect page. On mobile, called automatically inside `login()`. |
| `isAuthenticated()`            | `async` method returning `Promise<boolean>` — true if an access token is stored. |
| `getUser()`                    | Fetches the authenticated user's profile using the stored access token.     |

### `redirectUri` is now required

`login()` requires a `redirectUri` — there is no longer a default value.

## Migration guide

### Before

```ts
// Once on mount:
sdk.oauth!.init({
  successCallback: (profile) => setUser(profile),
  errorCallback: (error) => setError(error.message)
})

// On sign-in button click:
sdk.oauth!.login({ scope: 'write', display: 'popup' })
```

### After

```ts
// On sign-in button click:
try {
  await sdk.oauth.login({
    scope: 'write',
    redirectUri: 'https://yourapp.com/callback'
  })
  setUser(await sdk.oauth.getUser())
} catch (error) {
  setError(error.message)
}
```

### `write_once` scope

Replace `write_once` with `write`.

### Callback page (`handleRedirect`)

On your callback page, call `handleRedirect()`. In a popup it forwards the
code to the parent window and closes itself; in a full-page redirect it
performs the token exchange locally:

```ts
await sdk.oauth.handleRedirect()
// Popup: closes automatically and resolves the parent login() promise
// Full-page redirect: token exchange complete — call getUser() next
```

On **mobile** (React Native / Expo), the redirect is handled automatically
inside `login()` — no call to `handleRedirect()` is needed.

## Registering a redirect URI

Register your redirect URI(s) at [audius.co/settings](https://audius.co/settings) → Developer Apps.

**Mobile** — use a custom URL scheme (e.g. `myapp://oauth/callback`) and register
the scheme as an intent filter in your app's native config.

**Local development** — register `http://localhost:PORT/callback` for your dev environment.

## React Native / Expo

Import from `@audius/sdk` on React Native — the native entry point automatically:

- Uses `AsyncStorage` for token persistence across app restarts
- Uses `expo-web-browser` (`openAuthSessionAsync`) for the OAuth browser session, bypassing universal link interception

No extra configuration is needed. `login()` resolves after the browser closes and
the token exchange completes:

```ts
await sdk.oauth.login({ scope: 'write', redirectUri: 'myapp://oauth/callback' })
const user = await sdk.oauth.getUser()
```
