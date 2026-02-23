# Getting Started with the Audius SDK

## Overview

The Audius JavaScript (TypeScript) SDK allows you to easily interact with the Audius protocol. Use the SDK to:

- 🔍 Search and display users, tracks, and playlists
- 🎵 Stream and upload tracks
- ❤️ Favorite, repost, and curate playlists
- ✍️ Allow your users to [log in with their Audius account](https://docs.audius.co/developers/log-in-with-audius) and act on their behalf

...and much more!

## Get Your API Key and Bearer Token

1. Visit the [Audius API Plans page](https://api.audius.co/plans) and click "Create API Key" to generate your credentials.

2. You will receive an **API Key** and a **Bearer Token**.

:::tip

Treat your bearer token like a password. Store it somewhere safe and don't expose it publicly. Never
share it with anyone.

:::

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

Initialize the SDK with your API key and bearer token.

### Node.js example

```js title="In Node.js environment"
import { sdk } from '@audius/sdk'

const audiusSdk = sdk({
  apiKey: 'Your API Key goes here',
  bearerToken: 'Your Bearer Token goes here'
})
```

### HTML + JS example

```js title="In web page"
const audiusSdk = window.audiusSdk({
  apiKey: 'Your API Key goes here',
  bearerToken: 'Your Bearer Token goes here'
})
```

:::warning

DO NOT include the bearer token if you are runing the SDK in the browser or anywhere in the client. The bearer token is what allows your app to write on behalf of the users that have authorized it to do so. Keep your bearer token secure and never expose it in client-side code that could be inspected.

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

## What's next?

- [Get authorization](https://docs.audius.co/developers/guides/log-in-with-audius) to access your app's users' Audius accounts

- [Explore the API docs](https://docs.audius.co/developers/sdk/tracks) to see what else you can do with the Audius SDK

## Direct API Access

You can also access the Audius API directly without the SDK:

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
