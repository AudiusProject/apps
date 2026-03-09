# docs.audius.co

Audius Developer Docs built with [Vocs](https://vocs.dev).

## Setup

```sh
npm install
```

## Development

```sh
npm run dev
```

Runs the Vocs dev server. For Cloudflare Pages testing:

```sh
npm run pages:dev
```

## Build & Preview

```sh
npm run build
npm run preview
```

`preview` serves the production build locally.

## Deploy

From the `main` branch:

```sh
npm run pages:deploy
```

Builds and deploys to Cloudflare Pages. Requires `wrangler login` if not authenticated.

## API Spec

The API reference loads the OpenAPI spec from `/openapi.yaml`. To sync from the live API:

```sh
npm run sync:api-spec
```

Downloads `https://api.audius.co/v1/swagger.yaml`, patches hosts to `api.audius.co`, deduplicates
servers, and saves to `docs/public/openapi.yaml`.
