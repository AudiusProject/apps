# 0033. Tooling and small packages

- Status: Accepted
- Date: 2026-11-21

## Context

The ES indexer, CLI commands, create-audius-app, migrate-tool, docs and lint/build config. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `packages/commands/src/comments/create-comment.ts`

- The create-comment command normalizes numeric entity ids to hashids because createCommentWithEntityManager's zod HashId schema only accepts hashid strings. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/commands/src/comments/create-comment.ts#L48))

### `packages/create-audius-app/create-app.ts`

- create-audius-app ships the template's .gitignore as 'gitignore' and copies it on install because npm does not publish .gitignore files. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/create-audius-app/create-app.ts#L73))

### `packages/create-audius-app/helpers/install.ts`

- create-audius-app's install() forces NODE_ENV=development because pnpm skips devDependencies when NODE_ENV is production. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/create-audius-app/helpers/install.ts#L33))

### `packages/create-audius-app/tests/e2e/react-hono/react-hono.test.ts`

- create-audius-app e2e tests preload hedgehog-entropy-key on audius.co so the OAuth login skips the email OTP step. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/create-audius-app/tests/e2e/react-hono/react-hono.test.ts#L9))

### `packages/create-audius-app/tests/e2e/react/react.test.ts`

- create-audius-app e2e tests preload hedgehog-entropy-key on audius.co so the OAuth login skips the email OTP step. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/create-audius-app/tests/e2e/react/react.test.ts#L6))

### `packages/distro/src/components/DistributorCard.tsx`

- DistributorCard stores the distributor appKey in localStorage before OAuth login so AuthProvider can recreate the SDK for that app after the redirect. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/distro/src/components/DistributorCard.tsx#L34))

### `packages/docs/docs/components/ApiReference.jsx`

- ApiReference intercepts cmd/ctrl+k in the capture phase so the Vocs site search never opens on the API page and Scalar's search opens instead. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/docs/docs/components/ApiReference.jsx#L16))

### `packages/docs/vocs.config.ts`

- The docs Vite config aliases ajv to the docs package's ajv@8 because ajv-draft-04 (via @scalar) needs v8 while the monorepo root has ajv@6. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/docs/vocs.config.ts#L11))
- The docs Vite config aliases zod to the docs package's zod@4.3.6 (pinned to @scalar's nested dep) because the monorepo root has zod@3. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/docs/vocs.config.ts#L13))
- The docs optimizeDeps includes @scalar/api-reference-react so the lazily imported Scalar is pre-bundled with zod v4 inlined. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/docs/vocs.config.ts#L18))
- The docs optimizeDeps excludes ai, @ai-sdk/provider-utils and @ai-sdk/gateway because they import zod/v4 and zod/v3 subpaths absent from the root zod@3. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/docs/vocs.config.ts#L21))

### `packages/es-indexer/src/conn.ts`

- es-indexer registers a pg type parser that parses INT8 as float because ES documents want numbers, and precision loss is acceptable. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/es-indexer/src/conn.ts#L9))

### `packages/es-indexer/src/indexers/TrackIndexer.ts`

- TrackIndexer overwrites created_at with release_date because get_feed_es sequences feed events by created_at, which was simpler than teaching the feed logic about release_date. ([L197](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/es-indexer/src/indexers/TrackIndexer.ts#L197))

### `packages/es-indexer/src/indexers/sharedIndexSettings.ts`

- es-indexer sets max_terms_count to 1,000,000 because get_feed_es terms lookups exceed the 65,536 default for users following more than 65k accounts. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/es-indexer/src/indexers/sharedIndexSettings.ts#L40))

### `packages/es-indexer/src/listener.ts`

- The es-indexer follows listener only marks the follower stale; the followee's follower_count is updated by listening on aggregate_user, which updates asynchronously after the follow. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/es-indexer/src/listener.ts#L96))

### `packages/es-indexer/src/main.ts`

- The es-indexer main loop sleeps 500ms between pending batches to free the event loop and batch queries to Postgres. ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/es-indexer/src/main.ts#L88))

### `packages/es-indexer/src/types/db.ts`

- es-indexer types/db.ts is generated by sql-ts and should be regenerated, not hand-edited. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/es-indexer/src/types/db.ts#L1))

### `packages/migrate-tool/api/_lib/audius.ts`

- migrate-tool getServerSDK holds the developer app's API secret, which must only live server-side; it uses createSdkWithServices so sdk.tracks has the wrapped createTrack and stream/download URL helpers. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/api/_lib/audius.ts#L8))

### `packages/migrate-tool/api/_lib/auth.ts`

- migrate-tool admin auth accepts only Google accounts on @audius.co/@audius.org, mints a short-lived signed JWT cookie, and also allows an optional static ADMIN_BEARER_TOKEN for CLI access. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/api/_lib/auth.ts#L4))
- SessionUser.name in migrate-tool is optional because session cookies minted before names were added do not carry it. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/api/_lib/auth.ts#L36))
- migrate-tool readCookie falls back to parsing the raw Cookie header because req.cookies is not populated in every Vercel runtime. ([L113](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/api/_lib/auth.ts#L113))

### `packages/migrate-tool/api/_lib/migrate.ts`

- migrate-tool buildAudioCandidates tries the original master by CID, then CID mirrors, then the gated download URL, then the transcoded MP3 stream, so every track migrates with the best copy still reachable. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/api/_lib/migrate.ts#L42))
- migrate-tool fetches the original master from a validator's /content/{cid} first because content-addressed files are served without download gating and are bit-for-bit originals. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/api/_lib/migrate.ts#L57))

### `packages/migrate-tool/api/admin/approve.ts`

- migrate-tool admin approve only flips status pending to approved in a conditional update, so a double-click or retry cannot start a migration twice. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/api/admin/approve.ts#L24))

### `packages/migrate-tool/vite.config.ts`

- migrate-tool's Vite config polyfills Buffer and process globally because the Audius SDK references them at runtime in the browser. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/migrate-tool/vite.config.ts#L8))

### `svgo.config.js`

- svgo config disables removeViewBox because SVGs need viewBox to resize with CSS (svgo issue 1128). ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/svgo.config.js#L8))
- svgo config disables cleanupIds minify because it sometimes generated duplicate IDs across SVGs. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/svgo.config.js#L12))
- svgo config keeps unused IDs because some are applied later via CSS. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/svgo.config.js#L15))
