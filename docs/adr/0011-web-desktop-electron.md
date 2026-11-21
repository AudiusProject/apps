# 0011. Desktop (Electron) app

- Status: Accepted
- Date: 2026-11-21

## Context

Electron main process, auto-update, downloads and browser push in the desktop build. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `scripts/dist.js`

- scripts/dist.js builds the desktop apps; Mac builds must run on macOS because they are codesigned and notarized. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/dist.js#L1))
- dist.js writeApiKeyFile rebuilds the App Store Connect .p8 from its base64 body because secret stores flatten or strip PEM newlines and notarytool rejects it with an opaque invalidPEMDocument. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/dist.js#L40))
- dist.js sets productName in extraMetadata because electron-builder uses it for the app-data location on most platforms. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/dist.js#L171))
- dist.js sets name in extraMetadata because Electron's app.getName drives the app-data location on some Linux platforms. ([L174](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/dist.js#L174))
- In dist.js the protocols scheme controls both desktop deep links and the local-storage prefix, so changing it affects stored data. ([L189](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/dist.js#L189))
- dist.js sets snap publish to a generic provider because electron-builder publishes to the snap store by default. ([L238](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/dist.js#L238))
- dist.js sets linux to AppImage only because 'default' expands to snap plus AppImage and the build image has no snapcraft. ([L266](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/dist.js#L266))

### `src/components/browser-push-confirmation-modal/BrowserPushConfirmationModal.tsx`

- BrowserPushConfirmationModal requests Safari push permission directly in the click handler because Safari requires a user action to trigger the request. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/browser-push-confirmation-modal/BrowserPushConfirmationModal.tsx#L74))

### `src/components/track/DownloadSection.tsx`

- DownloadSection shows no caret or expandable list when only the original is downloadable and there are no stems. ([L164](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/DownloadSection.tsx#L164))

### `src/electron.js`

- electron.js reads electronConfig.json with readFileSync because async reading would decide the protocol scheme after the app has already registered it. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/electron.js#L53))
- reformatURL in electron.js rewrites audius://route to audius://-/route so the route is loaded correctly from the filesystem. ([L107](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/electron.js#L107))
- electron.js converts the native fetch web ReadableStream to a Node stream before piping the web update tarball to disk. ([L161](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/electron.js#L161))
- electron.js also reads the version from the downloaded build's package.json because the local package.json is not updated after a web update. ([L201](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/electron.js#L201))
- electron.js only downloads web updates for patch bumps within the same major.minor; minor and major updates are left to the electron autoupdater. ([L210](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/electron.js#L210))
- electron.js requests a single-instance lock so a Windows deep link reuses the running app instead of launching a second one. ([L333](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/electron.js#L333))

### `src/hooks/useDownloadTrackStemsZip.ts`

- useDownloadTrackStemsZip triggers the stems zip with an anchor click; the response is an attachment so the browser download manager handles it without navigating. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useDownloadTrackStemsZip.ts#L6))

### `src/pages/contest-page/components/ContestStemsCard.tsx`

- ContestStemsCard's per-row download deliberately omits parentTrackId, since the download flow appends the parent to the batch and a non-downloadable parent 404s and fails the whole batch; this matches DownloadRow. ([L173](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestStemsCard.tsx#L173))

### `src/pages/contest-page/components/desktop/ContestPage.tsx`

- The desktop ContestPage only renders Stems & Downloads when the track has downloadable content, because DownloadSection's useFileSizes query throws for non-downloadable tracks and trips the error boundary. ([L253](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L253))

### `src/pages/contest-page/components/mobile/ContestPage.tsx`

- The mobile ContestPage only mounts Stems & Downloads when the track has downloadable content, since DownloadSection errors otherwise. ([L336](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/mobile/ContestPage.tsx#L336))

### `src/services/audius-sdk/createKey.ts`

- createKey runs scrypt in an inline worker started from a blob URL so login does not freeze the page and it works under the desktop app's custom scheme. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audius-sdk/createKey.ts#L3))

### `src/services/track-download.ts`

- track-download skips target=\_blank on mobile Safari because it makes the download unresponsive there. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/track-download.ts#L26))
- track-download explicitly checks abortSignal after Promise.allSettled and throws an AbortError, because allSettled swallows the abort rejection. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/track-download.ts#L56))
- track-download zips whatever files are available and skips failures, because a single unavailable file such as a non-downloadable parent returning 404 used to fail the whole batch. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/track-download.ts#L64))
