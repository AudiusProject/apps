# docs.audius.co

## Dependencies

Install dependencies:

```sh
npm install
```

---

## Development Server

To run the docs locally:

```sh
npm run dev
```

To develop on Cloudflare pages and test the whole stack:

```sh
npm run pages:dev
```

---

## Updating the API Spec

The API reference uses Stoplight Elements and loads the OpenAPI spec from `/openapi.yaml`. To sync the latest spec from the live API:

```sh
npm run sync:api-spec
```

This script:

- Downloads `https://api.audius.co/v1/swagger.yaml`
- Rewrites any legacy `discoveryprovider.audius.co` hosts to `api.audius.co`
- Saves the patched spec to `docs/public/openapi.yaml`
- Deduplicates server entries

---

## Build

```sh
npm run build
```

---

## Publish

To deploy to docs.audius.co, run from the `main` branch:

```sh
npm run build
npm run pages:deploy
```
