# 0027. Build, OTA, startup and performance on mobile

- Status: Accepted
- Date: 2026-11-21

## Context

Bundle size, CodePush OTA, startup ordering, performance, data fetching, testing and tooling. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `.eslintrc.js`

- The mobile .eslintrc import/resolver alias map is required so the import/order rule can classify app/utils/common imports. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/.eslintrc.js#L24))

### `__tests__/App-test.tsx`

- In App-test, react-test-renderer must be imported after react-native or the test environment breaks. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/__tests__/App-test.tsx#L6))

### `babel-plugin-cherry-pick-imports.js`

- babel-plugin-cherry-pick-imports rewrites named lodash/react-use imports to per-member modules because Metro cannot tree-shake and would bundle the whole library. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/babel-plugin-cherry-pick-imports.js#L1))

### `code-push.config.ts`

- code-push.config.ts uses import.meta.url instead of **dirname because ts-node/code-push load it as ESM in CI where **dirname is undefined. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/code-push.config.ts#L18))
- code-push.config.ts re-exports bundleUploader/getReleaseHistory/setReleaseHistory as named exports because the code-push CLI loads it via require(), which only sees named exports. ([L139](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/code-push.config.ts#L139))

### `jest.config.js`

- jest.config resolves react-native and testing-library from packages/mobile so the moduleNameMapper works whether npm hoists them or not. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/jest.config.js#L3))
- jest.config uses the react-native-worklets jest resolver because the native Worklets implementation needs the native runtime. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/jest.config.js#L10))
- jest testTimeout is 30s because a screen's first render loads its whole module tree and exceeds the 5s default on CI. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/jest.config.js#L14))

### `metro.config.js`

- metro.config strips all non-English BIP-39 wordlists because viem and legacy bip39 otherwise pull in ~550 KB of lists. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L23))
- resolveStrippedBip39Wordlist returns an empty module for non-English @scure/bip39 lists because viem reads them lazily through getters. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L31))
- Legacy bip39 wordlist JSON imports can be stubbed because bip39 requires each list in try/catch and skips failures. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L34))
- metro.config points same-major duplicate packages at one canonical copy but excludes @noble/hashes because 1.7 renamed \_assert.bytes and @scure/bip32 still calls bytes. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L46))
- Metro middleware answers /status with exactly "packager-status:running" because the Android dev check expects that string. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L134))
- Metro middleware adds CORS headers for Android/okhttp user agents because React Native 0.78 Android dev requests need them. ([L140](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L140))
- metro.config aliases workspace packages like fixed-decimal/spl/eth to src so CI and CodePush builds work without a turbo build of dist. ([L196](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L196))
- resolveRequest maps ./file.js imports to ./file.ts because TS packages use NodeNext-style specifiers and Metro resolves paths literally. ([L241](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/metro.config.js#L241))

### `src/app/App.tsx`

- App.tsx registers a nice-modal adapter so common sagas/services can show modals without depending on nice-modal-react directly. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/App.tsx#L49))
- App.tsx tracks localStoragePreloaded at module load so React never waits when the AsyncStorage preload has already finished. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/App.tsx#L68))
- App.tsx subscribes to the preload promise even when the flag is set because it can resolve between first render and the effect. ([L90](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/App.tsx#L90))
- App.tsx renders nothing until the cached account preload lands, otherwise useCurrentAccount returns null and the sign-on screen flashes for logged-in users. ([L98](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/App.tsx#L98))

### `src/app/Drawers.tsx`

- Drawers.tsx maps each drawer to a thunk so Metro inline requires load a drawer module only on first open instead of at startup. ([L113](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/Drawers.tsx#L113))

### `src/app/ota-updates.ts`

- ota-updates only checks for CodePush updates when OTA_UPDATE_URL is set in .env. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/ota-updates.ts#L1))
- ota-updates uses package.json version because CI publishes with that as --binary-version, not the native version. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/ota-updates.ts#L19))
- releaseHistoryNoUpdatePlaceholder returns one synthetic release with empty downloadUrl because an empty history makes CodePush throw and console.error "There is no latest release". ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/ota-updates.ts#L88))
- releaseHistoryFetcher fetches {base}/histories/{platform}/{channel}/{package.json version}.json, matching the CI binary version rather than native version strings. ([L124](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/ota-updates.ts#L124))

### `src/app/registerNiceModals.ts`

- registerNiceModals is imported from App.tsx so every NiceModal.register runs before anything calls showNiceModal; new modals must be added there. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/registerNiceModals.ts#L1))

### `src/components/collapsible-tabs/FlatList.tsx`

- collapsible-tabs FlatList wraps the animated list in React.memo to avoid rerendering on every context change (react issue 15156). ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/FlatList.tsx#L16))

### `src/components/collapsible-tabs/ScrollView.tsx`

- collapsible-tabs ScrollView wraps Animated.ScrollView in React.memo to avoid rerendering on every context change (react issue 15156). ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/ScrollView.tsx#L16))

### `src/components/collapsible-tabs/SectionList.tsx`

- collapsible-tabs SectionList wraps the animated list in React.memo to avoid rerendering on every context change (react issue 15156). ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/SectionList.tsx#L16))

### `src/components/collapsible-tabs/hooks.tsx`

- collapsible-tabs hooks strip children from tab element props so the tab options object does not change on every render. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/hooks.tsx#L75))

### `src/components/collapsible-tabs/types.ts`

- Collapsible tabs headerHeight is optional but passing it avoids an extra layout pass on first render. ([L71](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/types.ts#L71))
- Collapsible tabs tabBarHeight is optional but passing it avoids an extra layout pass on first render. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/types.ts#L75))

### `src/components/contest-card/ContestCard.tsx`

- ContestCard requests 1000x1000 artwork for the full-width hero variant and 480x480 for narrower grid cards. ([L247](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/contest-card/ContestCard.tsx#L247))

### `src/components/core/FixedFooter.test.tsx`

- FixedFooter tests set IS_REACT_ACT_ENVIRONMENT because React 19 requires it when using the test renderer directly. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/FixedFooter.test.tsx#L18))

### `src/components/image/UserImage.tsx`

- UserImage uses a 3s per-URL timeout so a stalled validator node advances to the next mirror instead of waiting 60-90s for the OS TCP timeout, matching web MirrorImage. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/image/UserImage.tsx#L12))

### `src/components/lineup/LineupContext.ts`

- LineupContext is populated once by the lineup so per-tile subscriptions such as useNavigationState do not run once per tile on every list render. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/LineupContext.ts#L3))

### `src/components/lineup/TrackLineup.tsx`

- TrackLineup uses onEndReachedThreshold 1 so the next page is requested when one full viewport of content remains, before the user reaches the bottom. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L54))
- TrackLineup takes only track IDs; tiles read full track data from the TanStack Query cache, which the hook producing the list must have primed. ([L89](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L89))
- TrackLineup reads playback state from the store at press time instead of subscribing, so play/pause/skip do not re-render every tile; tiles select their own active state. ([L197](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L197))
- TrackLineup keys entries by entity rather than position so a refetch that reorders the list moves tiles instead of remounting them; repeated entities get a suffix. ([L313](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L313))
- TrackLineup keeps a synchronous isLoadMoreTriggered flag so load-more skeletons render on the next frame instead of waiting for TanStack Query isFetching to propagate. ([L339](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L339))
- TrackLineup sets windowSize 11 (about 5 screens each side, below the default) because feed, trending and profile lineups all stay mounted. ([L502](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L502))

### `src/components/navigation-container/NavigationContainer.tsx`

- NavigationContainer records screen views only for primary routes; secondary routes like Track, Collection and Profile record their own views in the component. ([L200](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/navigation-container/NavigationContainer.tsx#L200))

### `src/components/now-playing-drawer/Artwork.tsx`

- Now Playing Artwork loads 480px art while the drawer is collapsed and 1000px only when open, since the collapsed drawer hides the artwork. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/Artwork.tsx#L97))

### `src/components/now-playing-drawer/NowPlayingDrawer.tsx`

- NowPlayingDrawer is memoized because the bottom tab bar render function re-renders it frequently during tab navigation. ([L139](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L139))

### `src/components/ota-update-banner/OtaUpdateBanner.tsx`

- OtaUpdateBanner polls for a pending CodePush package for a few minutes after mount/foreground because the download is done by ota-root's sync (tens of seconds), not by prefetchUpdate. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/ota-update-banner/OtaUpdateBanner.tsx#L69))
- OtaUpdateBanner only surfaces downloaded ON_NEXT_RESTART packages; because it mounts during ota-root's sync its own sync call returns SYNC_IN_PROGRESS, so it detects the pending package by polling. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/ota-update-banner/OtaUpdateBanner.tsx#L76))
- OtaUpdateBanner bumps pollGenerationRef on every stop/restart so an in-flight poll from a previous generation cannot reschedule itself. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/ota-update-banner/OtaUpdateBanner.tsx#L93))

### `src/hooks/useSessionCount.ts`

- useSessionCount stores the session count at which the callback last fired so a callback redefined every render does not fire repeatedly for the same session. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useSessionCount.ts#L28))

### `src/screens/app-drawer-screen/left-nav-drawer/FeatureFlagsNavItem.tsx`

- FeatureFlagsNavItem also shows in **DEV** builds because debug builds against production env use Optimizely defaults where feature_flag_access is off. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-drawer-screen/left-nav-drawer/FeatureFlagsNavItem.tsx#L19))

### `src/screens/profile-screen/ProfileHeader/ProfileHeader.tsx`

- ProfileHeader is wrapped in memo because material-top-tabs triggers unnecessary rerenders of the header. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileHeader/ProfileHeader.tsx#L34))

### `src/screens/root-screen/RootScreen.tsx`

- RootScreen's runAfterStartup falls back after STARTUP_DEFER_MAX_MS (3s) because an InteractionManager handle may never clear and would otherwise block deferred startup work forever. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/root-screen/RootScreen.tsx#L53))
- RootScreen keeps the native splash up until the react-query cache finishes restoring from AsyncStorage, so the skeleton-to-content swap happens under the splash and the user never sees a slide down/up glitch. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/root-screen/RootScreen.tsx#L92))

### `src/screens/sign-on-screen/screens/CreateEmailScreen.test.tsx`

- CreateEmailScreen tests mock @audius/common/schemas because the real emailSchema refinement calls /users/check over the network. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/screens/CreateEmailScreen.test.tsx#L18))

### `src/screens/sign-on-screen/screens/SelectGenresScreen.tsx`

- SelectGenresScreen memoizes SelectablePill with a comparator on isSelected only, deliberately preventing other prop changes from re-rendering pills to fix a performance issue. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/screens/SelectGenresScreen.tsx#L32))

### `src/screens/track-screen/TrackScreen.tsx`

- TrackScreen prefetches comments on mount using the route-param trackId so the comment section renders from cache instead of fetching only after the user fetch and secondary-content gate. ([L44](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/track-screen/TrackScreen.tsx#L44))
- TrackScreen starts the related-tracks lineup prefetch as soon as the hero track and owner resolve, instead of waiting for the ScreenSecondaryContent screen-ready gate. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/track-screen/TrackScreen.tsx#L53))

### `src/screens/weekly-rotation-screen/WeeklyRotationScreen.tsx`

- WeeklyRotationScreen fires its view analytics event once, only after the mix query succeeds or errors, so trackCount and status are real values. ([L174](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/weekly-rotation-screen/WeeklyRotationScreen.tsx#L174))

### `src/services/analytics.ts`

- Mobile analytics sets Amplitude minIdLength to 1 because Amplitude rejects user ids (handles) shorter than 5 characters by default. ([L50](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/analytics.ts#L50))
- analytics.identify skips sending traits identical to the last identify (it runs on every account load) since Amplitude user properties persist, but includes the week number so it resends weekly in case one was dropped. ([L118](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/analytics.ts#L118))

### `src/services/local-storage.ts`

- local-storage preloads the account sync cache because AsyncStorage getItem is async on RN, so useCurrentAccount placeholderData's sync read returned null and flashed the sign-on screen. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/local-storage.ts#L8))

### `src/services/query-client.ts`

- The mobile queryClient uses a custom QueryCache with onError because that is the only way to install a default error handler for all queries in react-query. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/query-client.ts#L7))
- The mobile queryClient uses defaultRetryConfig to stop retrying 4xx errors, since tan-query retries 404s by default. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/query-client.ts#L16))

### `src/services/query-persister.ts`

- query-persister only persists the queries needed to paint Trending on cold start, because a wide allowlist bloats the snapshot and forces large JSON.stringify calls on the JS thread, causing periodic freezes. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/query-persister.ts#L14))
- query-persister persists only track and user entities referenced by the persisted lineups and account, keeping the snapshot (and the restore the splash waits on) the size of the trending lineup. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/query-persister.ts#L39))
- The query cache persister throttles AsyncStorage writes to once per 5 seconds because the JSON.stringify runs on the JS thread and frequent writes cause frame drops. ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/query-persister.ts#L88))

### `src/services/remote-config/remote-config-instance.ts`

- remote-config reports OTA version 'native' when no CodePush bundle is applied so Optimizely audiences can target native vs OTA builds without confusing it with missing data. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/remote-config/remote-config-instance.ts#L21))
- remote-config references Optimizely named imports only inside createOptimizelyClient callbacks so Metro inline requires load the SDK when the client is created, not during initial module evaluation. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/remote-config/remote-config-instance.ts#L53))

### `src/shims/crypto.js`

- The mobile crypto shim (wired in metro.config.js) implements only random bytes, hashes, HMAC, PBKDF2 and AES because bundled callers use nothing else; react-native-crypto pulled in heavy asn1/sign deps, and random bytes now come from react-native-get-random-values. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/shims/crypto.js#L1))

### `src/shims/react-router.ts`

- Metro resolves react-router to a throwing shim on mobile because mobile reaches it only via web route utils whose matchPath/useLocation helpers are web-only, keeping ~225 KB out of the bundle. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/shims/react-router.ts#L1))

### `src/shims/stripped-bip39-wordlist.js`

- Non-English bip39 wordlists resolve to a throwing shim on mobile; this is safe because bip39 loads each list in a try/catch and skips failures. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/shims/stripped-bip39-wordlist.js#L1))

### `src/store/offline-downloads/sagas/rehydrateOfflineDataSaga.ts`

- rehydrateOfflineDataSaga reads offline items 8 at a time because each read is several native fs calls and one-at-a-time round trips slowed startup. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/sagas/rehydrateOfflineDataSaga.ts#L40))

### `src/store/offline-downloads/slice.ts`

- The offlineDownloads persist config throttles writes to 1s because each job update otherwise re-serializes and rewrites the whole slice during large batch downloads. ([L464](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/slice.ts#L464))

### `src/store/sign-out/sagas.ts`

- On sign-out, queryClient.resetQueries() must be called before queryClient.clear(): clear() deletes the cache but doesn't rerender active queries, and resetQueries() triggers the rerender. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/sign-out/sagas.ts#L53))
- On sign-out, queryClient.resetQueries() must be called before queryClient.clear(): clear() deletes the cache but doesn't rerender active queries, and resetQueries() triggers the rerender. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/sign-out/sagas.ts#L57))

### `src/store/store.ts`

- On fatal errors the mobile store restarts the app only if the session is older than 30 seconds, to avoid a crash-restart loop. ([L84](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/store.ts#L84))
- The store creates a shared stdChannel for saga middleware so lazily loaded sagas can be handed actions that arrived before they started. ([L110](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/store.ts#L110))

### `src/types/analytics.ts`

- MOBILE_CORE_EVENTS lists mobile share-channel events that are exempt from analytics sampling. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/types/analytics.ts#L28))
- notificationCampaignId on notification analytics events must match the Amplitude / engagement sync join key. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/types/analytics.ts#L48))

### `src/utils/webCrypto/subtleCrypto.ts`

- subtleCrypto implements only the SubtleCrypto calls bundled code uses (AES-GCM, HMAC SHA-256, PBKDF2, SHA digests) on @noble, replacing @peculiar/webcrypto which pulled ~170 KB plus Node crypto polyfills; new callers needing other algorithms must extend it. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/webCrypto/subtleCrypto.ts#L8))
