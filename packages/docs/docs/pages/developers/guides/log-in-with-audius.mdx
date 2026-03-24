---
title: Log In With Audius
description: Audius Protocol Documentation
---

# Log In with Audius

Log In with Audius lets you retrieve a user's Audius profile information and optionally get
permission to perform actions on their behalf, without making the user give you their Audius
password.

The SDK implements the **OAuth 2.0 Authorization Code Flow with PKCE** — no backend server or
client secret is required.

## 1. Get an API Key

Create a developer app and obtain an API key from either:

- **In-app settings** — [audius.co/settings](https://audius.co/settings) → Developer Apps
- **Developer portal** — [api.audius.co/plans](https://api.audius.co/plans)

## 2. Register a Redirect URI

On the same page, register the **redirect URI(s)** your app will use. Audius validates the redirect
URI in every authorization request against this list.

- **Web popup / full-page redirect**: register your callback page URL (e.g. `https://yourapp.com/callback`)
- **Mobile (React Native)**: register a custom URL scheme (e.g. `myapp://oauth/callback`)
- **Local development**: register `http://localhost:PORT` (or the specific path you use)

## 3. Initialize the SDK

```ts
import { sdk } from '@audius/sdk'

const audiusSdk = sdk({
  appName: 'My App',
  apiKey: 'YOUR_API_KEY',
  redirectUri: 'https://yourapp.com/callback',
})
```

On **React Native / Expo** (requires React Native 0.71+ / Expo SDK 48+), import from `@audius/sdk`
as normal — the native entry point is resolved automatically and configures `AsyncStorage`-backed
token persistence and `expo-web-browser` for the OAuth browser session out of the box. Make sure
both peer dependencies are installed:

```sh
npx expo install expo-web-browser @react-native-async-storage/async-storage
```

## 4. Log the User In

Call `login()` with a registered `redirectUri`. The SDK runs the full PKCE exchange and stores the
resulting access and refresh tokens automatically.

```ts
await audiusSdk.oauth.login({ scope: 'write' })

const user = await audiusSdk.oauth.getUser()
console.log('Signed in as', user.name)
```

:::note

The `write` scope grants permission to perform most actions on the user's behalf (upload, favorite,
etc.) but does **not** allow access to DMs or wallets. Use `'read'` if your app only needs profile
info.

:::

## 5. Handle the Callback (web only)

On your callback page (the `redirectUri`), initialize the SDK and call `handleRedirect()`. The SDK
handles both flows automatically:

- **Popup**: Detects `window.opener`, forwards the authorization code to the parent window, and
  closes the popup. The parent's `login()` promise resolves.
- **Full-page redirect**: Performs the PKCE token exchange and stores the tokens. Call `getUser()`
  to retrieve the profile.

```ts
const audiusSdk = sdk({ appName: 'My App', apiKey: 'YOUR_API_KEY' })

await audiusSdk.oauth.handleRedirect()
// Popup: closes automatically, login() in parent resolves
// Full-page redirect: token exchange complete, call getUser() next
```

:::tip

On **mobile**, `handleRedirect()` is called automatically inside `login()` — your app does not
need to call it at all.

:::

:::tip

For the **popup flow**, the popup window must load your callback page before `handleRedirect()` can
run. If your app has a large JavaScript bundle, users will see a spinner in the popup while it
loads. To avoid this, use a dedicated lightweight callback page at your `redirectUri` that only
initializes the SDK and calls `handleRedirect()` — rather than loading your full app.

:::

## 6. Restore an Existing Session

On page/app load, check `isAuthenticated()` to avoid prompting the user to log in again.

```ts
if (await audiusSdk.oauth.isAuthenticated()) {
  const user = await audiusSdk.oauth.getUser()
  // restore UI
}
```

## Full Examples

See the
[web upload example](https://github.com/AudiusProject/audius-protocol/tree/main/packages/web/examples/upload)
and the
[React Native upload example](https://github.com/AudiusProject/audius-protocol/tree/main/packages/mobile/examples/upload)
for complete, runnable apps that sign in with OAuth and upload a track — no backend required.

## Example Use Cases

#### Write scope

- Upload tracks to your users' Audius accounts
- Save tracks to your users' Audius libraries

#### Read-only scope

- Provide a convenient way for users to sign up and/or log in to your app without having to set a
  password or fill in a profile form
- Associate a user to their Audius account so that you can retrieve their Audius data (e.g. retrieve
  their tracks)
- Confirm if a user is a "Verified" Audius artist

Note that this flow **CANNOT**:

- Manage the user's login session on your app

## Manual Implementation

If you are not able to use the Audius JavaScript SDK, you may implement the OAuth 2.0 Authorization
Code Flow with PKCE manually. All OAuth endpoints are on the Audius API at
`https://api.audius.co/v1`.

### 1. Generate PKCE parameters

Before opening the consent screen, generate two values client-side:

- **`code_verifier`** — a cryptographically random URL-safe string, 43–128 characters
- **`code_challenge`** — `BASE64URL(SHA256(code_verifier))`
- **`state`** — a random string for CSRF protection; store it so you can verify it on the redirect

```js
// Example using the Web Crypto API
async function generatePkce() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const encoded = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return { codeVerifier, codeChallenge }
}
```

### 2. Open the consent screen

Direct the user to:

```noInline
https://api.audius.co/v1/oauth/authorize
  ?response_type=code
  &scope=read
  &api_key=YOUR_API_KEY
  &redirect_uri=https://mydemoapp.com/callback
  &state=YOUR_STATE
  &code_challenge=YOUR_CODE_CHALLENGE
  &code_challenge_method=S256
```

**Required params**

- `response_type` — always `code`
- `scope` — `"read"` or `"write"`
- `api_key` — your Audius API key (use `app_name` instead if you only need read scope and don't have an API key)
- `redirect_uri` — must match a URI registered in your developer app settings. Validation rules:
  - Must use `http` or `https`
  - Hosts cannot be raw IP addresses (localhost IPs are allowed)
  - Cannot contain `#`, `userinfo`, or path traversal (`/..`, `\..`)
- `state` — your CSRF token; Audius returns this unchanged in the redirect
- `code_challenge` — BASE64URL(SHA256(code_verifier))
- `code_challenge_method` — always `S256`

**Optional params**

- `response_mode` — `"fragment"` (default) or `"query"` — how params are returned in the redirect URL
- `display` — `"popup"` (default) or `"fullScreen"`

:::tip[Remember to handle early exiting]

If the user closes the window before completing the flow, your app should detect this and update the
UI accordingly.

:::

### 3. Receive the authorization code

After the user approves, Audius redirects to your `redirect_uri` with `code` and `state` as URI
fragment params (or query params if you set `response_mode=query`):

```noInline
https://mydemoapp.com/callback
  #code=AUTH_CODE
  &state=YOUR_STATE
```

**Verify that the `state` value matches what you sent.** If it doesn't, abort — this may indicate a
CSRF attack.

### 4. Exchange the code for tokens

POST to `https://api.audius.co/v1/oauth/token` with the authorization code and your PKCE verifier:

```http
POST https://api.audius.co/v1/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "code_verifier": "YOUR_CODE_VERIFIER",
  "client_id": "YOUR_API_KEY",
  "redirect_uri": "https://mydemoapp.com/callback"
}
```

**Success response (200)**

```json
{
  "access_token": "...",
  "refresh_token": "..."
}
```

Store both tokens. The access token is a short-lived Bearer token; the refresh token is used to
obtain new access tokens without re-prompting the user.

**Error response**

Non-2xx responses include an `error` and `error_description` field in the JSON body.

### 5. Get the user's profile

```http
GET https://api.audius.co/v1/me
Authorization: Bearer ACCESS_TOKEN
```

**Success response (200)**

```ts
{
  userId: number       // unique Audius user identifier
  name: string         // display name
  handle: string
  verified: boolean    // Audius verified checkmark
  profilePicture?: {
    '150x150': string
    '480x480': string
    '1000x1000': string
    mirrors: string[]
  }
}
```

### 6. Refresh the access token

When the access token expires, exchange the refresh token for a new one:

```http
POST https://api.audius.co/v1/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "client_id": "YOUR_API_KEY"
}
```

Returns the same `{ access_token, refresh_token }` shape as step 4.

### 7. Revoke the token (logout)

To log the user out, revoke the refresh token server-side then discard both tokens from your storage:

```http
POST https://api.audius.co/v1/oauth/revoke
Content-Type: application/json

{
  "token": "YOUR_REFRESH_TOKEN",
  "client_id": "YOUR_API_KEY"
}
```

Per [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009), revocation errors are non-fatal — if the request fails, discard the tokens locally regardless.

## API Reference

For full SDK method documentation (`login`, `getUser`, `handleRedirect`, `isAuthenticated`,
`logout`, and more), see the [OAuth API reference](/sdk/oauth).
