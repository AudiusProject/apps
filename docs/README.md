# docs.audius.org

## Dependencies

Install dependencies, run:

```sh
npm install
```

---

## Development Server

To run the docs locally, run:

```sh
npm run start
```

To develop on Cloudflare pages and test the whole stack, run:

```sh
npm run pages:dev
```

---

## Generate REST API docs

### Configure

Open `docusaurus.config.js` and find the `config:plugins:docusaurus-plugin-openapi-docs:config`
section values.

Edit the commented fields to suit your needs

```js
config: {
 api: {
   specPath: 'docs/developers/openapi.yaml', // synced from https://api.audius.co/v1/swagger.yaml
   outputDir: 'docs/developers/api', // output directory for generated *.mdx and sidebar.js files
   sidebarOptions: {
     groupPathsBy: 'tag', // generate a sidebar.js slice that groups operations by tag
   },
 },
},
```

> [!NOTE]
>
> Use `npm run gen:api-docs` (below) to sync the live spec and keep the base URL set to `https://api.audius.co/v1`.

### Updating the Live API Docs

1. From the repo root, run:

```sh
npm run gen:api-docs
```

This script:

- Downloads `https://api.audius.co/v1/swagger.yaml`
- Rewrites any legacy `discoveryprovider.audius.co` hosts to `api.audius.co`
- Saves the patched spec to `docs/developers/openapi.yaml`
- Regenerates every API doc (and `docs/developers/api/sidebar.ts`) from the live spec

> Powered by [docusaurus-plugin-openapi-docs](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs)

---

## Build

```sh
npm run build
```

---

## Publish

Running the following commands will create a public test site to view your changes.

To deploy to docs.audius.org, ensure the commands are run from the `main` branch.

```sh
npm run build
npm run pages:deploy
```
