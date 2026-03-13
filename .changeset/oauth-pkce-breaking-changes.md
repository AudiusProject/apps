---
'@audius/sdk': major
---

OAuth: drop implicit flow, remove `login()`/`init()`, require PKCE

The OAuth service now exclusively uses the OAuth 2.0 Authorization Code
Flow with PKCE. The implicit flow (Ethereum-signed JWT) has been removed.

## Breaking changes

### Removed APIs

| Removed                                          | Replacement                                        |
| ------------------------------------------------ | -------------------------------------------------- |
| `oauth.init({ successCallback, errorCallback })` | No replacement — call `login()` directly           |
| `oauth.login({ ... })`                           | `await oauth.login({ redirectUri, ... })`          |
| `oauth.renderButton(element, options)`           | No replacement — build your own sign-in button     |
| `LoginSuccessCallback` type                      | Use `login().then()` or `await login()`            |
| `LoginErrorCallback` type                        | Use `login().catch()` or try/catch `await login()` |
| `ButtonOptions` type                             | -                                                  |
| `LoginResult` type                               | Call `oauth.getUser()` after login instead         |
| `write_once` scope                               | Use `write` scope instead                          |
| `WriteOnceParams` type                           | —                                                  |

### Changed return types

`login()` now returns `Promise<void>` instead of
`Promise<LoginResult>`. After a successful login, call `oauth.getUser()`
to retrieve the authenticated user's profile.

`getRedirectResult()` now returns `Promise<void>` instead of
`Promise<LoginResult | null>`. Call `oauth.getUser()` after
`getRedirectResult()` resolves to retrieve the profile.

### `redirectUri` is now required

`login()` requires a `redirectUri` parameter — there is no longer
a default value.

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
  await sdk.oauth!.login({
    scope: 'write',
    redirectUri: 'https://yourapp.com/callback'
  })
  setUser(await sdk.oauth!.getUser())
} catch (error) {
  setError(error.message)
}
```

On your callback page (the `redirectUri`), initialize the SDK and call `getRedirectResult()`:

```ts
await sdk.oauth!.getRedirectResult()
// Popup: closes automatically and resolves the parent login() promise
// Full-page redirect: completes the token exchange. You can then call getUser()
```

### `write_once` scope

The `write_once` scope has been removed. Replace it with `write`.

## Registering a redirect URI

`login()` now requires a `redirectUri` and Audius validates it against your registered URIs.
Register your URI(s) in one of:

- **In-app settings** — [audius.co/settings](https://audius.co/settings) → Developer Apps
- **Developer portal** — [api.audius.co/plans](https://api.audius.co/plans)

Register the URL that Audius should redirect to after the user approves your app (e.g.
`https://yourapp.com/callback`). For the popup flow this is the popup callback page; for
full-page redirect it is the page the user lands on after approval.

**Local development tip** — register `http://localhost:PORT` (or the specific path you use) for
your dev environment. Multiple URIs can be registered independently.

**Mobile tip** — use a custom URL scheme deep link as your redirect URI (e.g.
`myapp://oauth/callback`). Register the same scheme in your app's native config (iOS
`Info.plist` / Android `AndroidManifest.xml`) so the OS routes the redirect back into your app.

## Setting up the callback page

On your callback page, initialize the SDK and call `getRedirectResult()`. The SDK handles both
flows automatically — in a popup it forwards the code to the parent window and closes itself; in
a full-page redirect it performs the token exchange locally. Then call `getUser()` to retrieve
the profile:

```ts
const audiusSdk = sdk({ appName: 'My App', apiKey: 'YOUR_API_KEY' })
await audiusSdk.oauth.getRedirectResult()
if (audiusSdk.oauth.isAuthenticated) {
  const user = await audiusSdk.oauth.getUser()
  console.log('Signed in as', user.name)
}
```

### Preserving the old callback-style behavior

If your existing code relied on a success/error callback passed to `init()`, you can preserve
that pattern with a small wrapper:

```ts
async function signIn(successCallback, errorCallback) {
  try {
    await sdk.oauth!.login({ scope: 'write', redirectUri: YOUR_REDIRECT_URI })
    const user = await sdk.oauth!.getUser()
    successCallback(user)
  } catch (err) {
    errorCallback(err)
  }
}
```
