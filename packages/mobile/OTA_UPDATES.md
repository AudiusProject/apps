# Over-the-Air (OTA) Updates

The mobile app uses [@bravemobile/react-native-code-push](https://www.npmjs.com/package/@bravemobile/react-native-code-push) for over-the-air JavaScript bundle updates. You can ship bug fixes and UI changes without going through the app store.

## How it works

- **Release builds** check for updates on app resume (configurable in `src/app/ota-root.tsx`).
- When `OTA_UPDATE_URL` is set in your env, the app fetches release history from  
  `{OTA_UPDATE_URL}/histories/{ios|android}/{channel}/{appVersion}.json`.
- If a newer update exists, the bundle is downloaded and applied on next app launch (or immediately with a restart).

## Setup

### 1. Env

In `.env.prod` (or the env used for release builds), set:

```bash
OTA_UPDATE_URL=https://your-cdn-or-api.com/codepush
OTA_CHANNEL=production   # optional; default is "production"
```

Leave `OTA_UPDATE_URL` unset to disable OTA (e.g. in dev). The app will still run; it just won’t check for updates.

### 2. Hosting

You need to host:

1. **Release history JSON** – one file per app version and channel, e.g.  
   `{OTA_UPDATE_URL}/histories/ios/production/1.5.167.json`  
   The format is an object mapping version strings to release info: `Record<version, { enabled, mandatory, downloadUrl, packageHash }>` (see [ReleaseHistoryInterface](https://github.com/Soomgo-Mobile/react-native-code-push) in the CodePush package).

2. **JS bundles** – the CLI produces a bundle file; `bundleUploader` in `code-push.config.ts` must upload it and return a `downloadUrl` that the client can fetch.

Options:

- **S3 / GCS / static hosting**: Implement `bundleUploader` to upload the bundle and `setReleaseHistory` to write the JSON to a path your CDN serves. `getReleaseHistory` can read from the same path (or an API).
- **Custom API**: Implement all three functions in `code-push.config.ts` to call your backend; the app’s `releaseHistoryFetcher` in `src/app/ota-updates.ts` already calls `OTA_UPDATE_URL` for the history JSON.

### 3. Implement `code-push.config.ts`

Edit `packages/mobile/code-push.config.ts`:

- **`bundleUploader`**: Upload the bundle at `source` to your storage and return `{ downloadUrl: 'https://...' }`.
- **`getReleaseHistory`**: Return the release history for the given `targetBinaryVersion`, `platform`, and `identifier` (e.g. from your CDN or API).
- **`setReleaseHistory`**: Persist the new release history (e.g. upload JSON to S3 or POST to your API).

The default `setReleaseHistory` writes to `build/codepush/histories/...` so you can test locally; point your `OTA_UPDATE_URL` at a server that serves that directory, or replace with your own storage.

## Publishing an update

From `packages/mobile`:

```bash
# Create initial history when you ship a new native build (e.g. 1.5.167)
npx code-push create-history --binary-version 1.5.167 --platform ios --identifier production
npx code-push create-history --binary-version 1.5.167 --platform android --identifier production

# Publish a new OTA update (e.g. 1.5.168) for that binary
npx code-push release \
  --binary-version 1.5.167 \
  --app-version 1.5.168 \
  --platform ios \
  --identifier production \
  --entry-file index.js

npx code-push release \
  --binary-version 1.5.167 \
  --app-version 1.5.168 \
  --platform android \
  --identifier production \
  --entry-file index.js
```

- `--binary-version`: Store version (the native app version that will receive the update).
- `--app-version`: Version of this OTA update (must be greater than `--binary-version` in SemVer).
- `--identifier`: Channel name (e.g. `production`, `staging`). Match `OTA_CHANNEL` in the app.

Optional: `--mandatory true`, `--rollout 50` (percentage). See `npx code-push release --help`.

## iOS / Android

- **iOS**: AppDelegate loads the bundle from CodePush in release; no extra native config beyond the existing CodePush pod (autolinked).
- **Android**: MainApplication uses `CodePush.getJSBundleFile()` in release; no extra native config.

After adding the package, run:

```bash
cd packages/mobile/ios && pod install && cd ../..
```

## Rollback

To disable a specific release:

```bash
npx code-push update-history \
  --binary-version 1.5.167 \
  --app-version 1.5.168 \
  --platform ios \
  --identifier production \
  --enable false
```

## References

- [@bravemobile/react-native-code-push](https://www.npmjs.com/package/@bravemobile/react-native-code-push) – npm and CLI usage
- [Soomgo-Mobile/react-native-code-push](https://github.com/Soomgo-Mobile/react-native-code-push) – repo and examples
