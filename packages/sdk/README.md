# Getting Started with the Audius SDK

## Overview

The Audius JavaScript (TypeScript) SDK allows you to easily interact with the Audius protocol. Use the SDK to:

- 🔍 Search and display users, tracks, and playlists
- 🎵 Stream and upload tracks
- ❤️ Favorite, repost, and curate playlists
- ✍️ Allow your users to [log in with their Audius account](https://docs.audius.co/developers/log-in-with-audius) and act on their behalf

...and much more!

## API Plans

Audius offers two API plans:

| Plan          | Rate Limit         | Monthly Requests       |
| ------------- | ------------------ | ---------------------- |
| **Free**      | 10 requests/second | 500,000 requests/month |
| **Unlimited** | Unlimited          | Unlimited              |

The Free plan is always free with no restrictions. For higher limits and support, contact [api@audius.co](mailto:api@audius.co) about the Unlimited plan.

## Get Your API Key

1. Visit the [Audius API Plans page](https://api.audius.co/plans) and click "Create API Key" to generate your credentials.

2. You will receive an **API Key** and a **Bearer Token**.

- **API Key** — used in all contexts (frontend and backend). Safe to include in client-side code.
- **Bearer Token** — backend only. Grants your app the ability to act on behalf of users who have authorized it. **Never expose this in browser or mobile code.**

## Install the SDK

- [Node.js](#nodejs)
- [HTML + JS](#html--js)

### Node.js

If your project is in a Node.js environment, run this in your terminal:

```bash
npm install @audius/sdk
```

[@audius/sdk on NPM](https://www.npmjs.com/package/@audius/sdk)

### HTML + JS

Otherwise, include the SDK script tag in your web page. The Audius SDK will then be assigned to `window.audiusSdk`.

```html
<script src="https://cdn.jsdelivr.net/npm/@audius/sdk@latest/dist/sdk.min.js"></script>
```

## Initialize the SDK

How you initialize the SDK depends on whether you are running in a **backend** (Node.js) or **frontend** (browser/mobile) context.

### Node.js (backend) example

Include your API key and bearer token. The bearer token enables your app to perform actions on behalf of authorized users.

```js title="In Node.js environment"
import { sdk } from '@audius/sdk'

const audiusSdk = sdk({
  apiKey: 'Your API Key goes here',
  bearerToken: 'Your Bearer Token goes here'
})
```

### HTML + JS (frontend) example

In a browser context, initialize with your **API key only** — no bearer token. User authentication is handled via the [OAuth flow](#log-in-with-audius-oauth) described below.

```js title="In web page"
const audiusSdk = window.audiusSdk({
  apiKey: 'Your API Key goes here'
})
```

:::warning

**Never include your bearer token in frontend code.** The bearer token allows your app to act on behalf of users who have authorized it. Exposing it in client-side code (browser or mobile) is a critical security risk — anyone who inspects your code could use it to impersonate your app.

For frontend apps, use the [OAuth flow](#log-in-with-audius-oauth) instead.

:::

## Make your first API call using the SDK

Once you have the initialized SDK instance, it's smooth sailing to making your first API calls.

```js
// Fetch your first track!
const track = await audiusSdk.tracks.getTrack({ trackId: 'D7KyD' })
console.log(track, 'Track fetched!')

// Favorite a track
const userId = (
  await audiusSdk.users.getUserByHandle({
    handle: 'Your Audius handle goes here'
  })
).data?.id
await audiusSdk.tracks.favoriteTrack({
  trackId: 'D7KyD',
  userId
})
```

## Full Node.js example

```js title="app.js" showLineNumbers
import { sdk } from '@audius/sdk'

const audiusSdk = sdk({
  apiKey: 'Your API Key goes here',
  bearerToken: 'Your Bearer Token goes here'
})

const track = await audiusSdk.tracks.getTrack({ trackId: 'D7KyD' })
console.log(track, 'Track fetched!')

const userId = (
  await audiusSdk.users.getUserByHandle({
    handle: 'Your Audius handle goes here'
  })
).data?.id

await audiusSdk.tracks.favoriteTrack({
  trackId: 'D7KyD',
  userId
})
console.log('Track favorited!')
```

## Full HTML + JS example

```html title="index.html" showLineNumbers
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@audius/sdk@latest/dist/sdk.min.js"></script>
    <script>
      const fn = async () => {
        const audiusSdk = window.audiusSdk({
          apiKey: 'Your API Key goes here'
        })
        const track = await audiusSdk.tracks.getTrack({ trackId: 'D7KyD' })
        console.log(track, 'Track fetched!')
      }

      fn()
    </script>
  </head>
  <body>
    <h1>Example content</h1>
  </body>
</html>
```

## Log In with Audius (OAuth)

For frontend apps, use the built-in OAuth 2.0 PKCE flow to authenticate users. This lets your users log in with their Audius account and authorize your app to act on their behalf — without ever exposing a bearer token in the browser.

```js title="In web page"
const audiusSdk = window.audiusSdk({
  apiKey: 'Your API Key goes here',
  redirectUri: 'https://your-app.com/oauth/callback'
})

// Redirect the user to Audius to log in
audiusSdk.oauth.login()

// On your callback page, handle the redirect:
await audiusSdk.oauth.handleRedirectCallback()
```

After the user logs in, the SDK stores their access token automatically and includes it in subsequent API calls. See the [Log In with Audius guide](https://docs.audius.co/developers/guides/log-in-with-audius) for the full flow.

## What's next?

- [Log in with Audius](https://docs.audius.co/developers/guides/log-in-with-audius) — add OAuth authentication to your frontend app

- [Explore the API docs](https://docs.audius.co/developers/sdk/tracks) to see what else you can do with the Audius SDK

## Direct API Access

You can also access the Audius API directly without the SDK. The examples below use a bearer token and are intended for **backend/server-side use only** — do not use your bearer token in browser or mobile code.

**REST API:**

```bash
curl -X GET "https://api.audius.co/v1/tracks/trending" \
  -H "Authorization: Bearer <YOUR-API-BEARER-TOKEN>"
```

**gRPC:**

```bash
grpcurl -H "authorization: Bearer <YOUR-API-BEARER-TOKEN>" \
  grpc.audius.co:443 list
```

For more details, visit the [API documentation](https://docs.audius.co/api) or the [Swagger definition](https://api.audius.co/v1).
