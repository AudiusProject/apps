# 0019. Build, state and testing on web

- Status: Accepted
- Date: 2026-11-21

## Context

Bundling, performance, Redux and query state, feature flags, error handling, and the e2e and unit test setup. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `.eslintrc.js`

- The web .eslintrc import/resolver aliases exist because src-relative absolute imports via TS baseUrl look like third-party packages to the import/order rule. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/.eslintrc.js#L9))

### `e2e/editCollection.test.ts`

- In editCollection.test the 'update audience' confirmation may not appear on retries, so the test clicks it if present and tolerates a TimeoutError. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/editCollection.test.ts#L31))
- editCollection.test waits up to 30s for the new title because artwork upload delays the save. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/editCollection.test.ts#L45))

### `e2e/page-object-models/modals.ts`

- In the e2e modals page object, the user search option is mounted at page level (portal), so it is queried via page() not the modal locator. ([L94](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/modals.ts#L94))
- In the e2e modals page object, radio inputs inside segmented controls are visually hidden, so check() needs force: true. ([L110](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/modals.ts#L110))
- In the e2e modals page object, radio inputs inside segmented controls are visually hidden, so check() needs force: true. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/modals.ts#L114))
- In the e2e modals page object, radio inputs inside segmented controls are visually hidden, so check() needs force: true. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/modals.ts#L122))
- In the e2e modals page object, radio inputs inside segmented controls are visually hidden, so check() needs force: true. ([L126](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/modals.ts#L126))
- In the e2e modals page object, radio inputs inside segmented controls are visually hidden, so check() needs force: true. ([L135](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/modals.ts#L135))

### `e2e/page-object-models/upload.ts`

- In the e2e upload page object, antd selects render a virtualized list, so options are located inside .rc-virtual-list. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/upload.ts#L25))
- In the e2e upload page object, antd selects render a virtualized list, so options are located inside .rc-virtual-list. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/upload.ts#L27))
- In the e2e upload page object, antd selects render a virtualized list, so options are located inside .rc-virtual-list. ([L188](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/upload.ts#L188))
- In the e2e upload page object, antd selects render a virtualized list, so options are located inside .rc-virtual-list. ([L199](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/page-object-models/upload.ts#L199))

### `e2e/signUp.test.ts`

- signUp.test fills password fields via getByLabel because password inputs have no accessible role (testing-library issue 567). ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/signUp.test.ts#L59))
- signUp.test only picks featured/genre artists when the featured group is visible, since dev environments may have no artists configured. ([L145](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/signUp.test.ts#L145))

### `e2e/socials.test.ts`

- socials.test waits for the unfavorite button after load and ignores failure, because initial render shows favorite before user state arrives. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/socials.test.ts#L12))
- socials.test waits for the unrepost button after load and ignores failure, because initial render shows repost before user state arrives. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/socials.test.ts#L35))

### `e2e/test.ts`

- The e2e test fixture wraps page.goto to wait for a client-only element, because SSR pages take long to hydrate. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/test.ts#L6))

### `scripts/apply-bundlesize-patch.js`

- scripts/apply-bundlesize-patch.js rewrites bundlesize's colors.js because chalk v4+ must be used as chalk.default or chalk, not required the old way. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/apply-bundlesize-patch.js#L3))

### `src/app/AppProviders.tsx`

- AppProviders' useRestoreWalletConnection loads AppKit at startup only when a persisted wallet connection exists; otherwise wagmi and AppKit load with the features that use them. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/AppProviders.tsx#L42))

### `src/app/appkit.ts`

- app/appkit.ts is the only lazy entry to ReownAppKitModal, which creates AppKit at module scope; eager code must use it to keep wallet SDKs out of the entry chunk. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/appkit.ts#L3))
- appkit.ts registerLoadedAppKit is called by ReownAppKitModal on evaluation so a static import from an already-lazy chunk is tracked like loadAppKit(). ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/appkit.ts#L17))
- appkit.ts loadAppKit clears the pending promise on failure so a later call can retry the chunk load. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/appkit.ts#L37))

### `src/app/audiusChain.ts`

- app/audiusChain.ts defines the Audius chain without @reown imports so importing it does not pull AppKit into the chunk. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/audiusChain.ts#L5))

### `src/app/registerNiceModals.ts`

- registerNiceModals registerLazyModal keeps AppKit, Coinflow and Solana out of the entry chunk; registration lives here, not in modal modules, so the lazy import cannot re-register and remount an open modal. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/registerNiceModals.ts#L16))

### `src/app/routes.tsx`

- routes.tsx lazy-loads CoinflowPurchaseProtection so @coinflowlabs/react and nsure-ai stay out of the entry chunk. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/routes.tsx#L26))

### `src/common/hooks/useSelector.ts`

- common/hooks/useSelector overrides TypedUseSelectorHook because reselect selectors take extra args beyond state, which the stock type rejects. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/hooks/useSelector.ts#L7))

### `src/common/store/backend/sagas.ts`

- backend sagas awaitReachability is specific to setupBackend; general code should use the reachability saga utils. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/backend/sagas.ts#L48))
- setupBackend dispatches fetchLocalAccount before reachability so an offline start still shows the cached account, then fetches again once connected. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/backend/sagas.ts#L61))
- setupBackend starts the remote account fetch with shouldMarkAccountAsLoading false because the local account was already loaded. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/backend/sagas.ts#L75))
- setupBackend returns before setupBackendSucceeded if the device is now offline, since startup optimistically assumes connectivity. ([L80](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/backend/sagas.ts#L80))

### `src/common/store/cache/collections/publishHiddenChildTracks.test.ts`

- publishHiddenChildTracks.test drives saga generators manually because the web vitest setup stubs redux-saga and redux-saga-test-plan fails under vitest ESM interop. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/publishHiddenChildTracks.test.ts#L13))

### `src/common/store/lifecycle/actions.ts`

- lifecycle ENTER_FOREGROUND/ENTER_BACKGROUND are dispatched by the native app only; web never dispatches them. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/lifecycle/actions.ts#L1))

### `src/common/store/social/users/sagas.ts`

- Success callbacks in the follow saga are spread into new objects because redux-saga cannot put frozen actions. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/social/users/sagas.ts#L171))

### `src/components/audio-transactions-table/isChangePositive.ts`

- isChangePositive lives in its own module so importers do not pull in AudioTransactionsTable and react-virtualized. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/audio-transactions-table/isChangePositive.ts#L7))

### `src/components/edit/fields/DatePickerField.tsx`

- DatePickerField lazy loads react-datepicker and its CSS and preloads on focus since it is only needed when the popup opens. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/DatePickerField.tsx#L13))
- DatePickerField imports the datepicker CSS dynamically to avoid lint errors about package exports. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/DatePickerField.tsx#L19))

### `src/components/lottie/LazyLottie.tsx`

- LazyLottie lazy-loads lottie-react to keep it out of the entry chunk; lottieRef stays null until loaded, so callers re-run playback effects on onLottieReady. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lottie/LazyLottie.tsx#L13))
- LazyLottie forwards lottieRef assignments because lottie-react sets lottieRef.current in an effect after setup, then notifies the caller. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lottie/LazyLottie.tsx#L31))

### `src/components/nav/desktop/PlaylistLibrary/CollectionNavItem.tsx`

- CollectionNavItem uses useCollection with enabled false so it only reads the cache and never fetches. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/desktop/PlaylistLibrary/CollectionNavItem.tsx#L101))

### `src/components/nav/desktop/PlaylistLibrary/usePlaylistPlayingStatus.ts`

- usePlaylistPlayingStatus reads collections with enabled false so the left nav doesn't fetch every collection. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/desktop/PlaylistLibrary/usePlaylistPlayingStatus.ts#L22))

### `src/components/table/Table.tsx`

- Table's loadMoreRows awaits fetchMore so InfiniteLoader's in-flight tracking works; otherwise it loops through every page of a cursor query. ([L707](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/table/Table.tsx#L707))

### `src/components/user-generated-text/ServerUserGeneratedText.tsx`

- ServerUserGeneratedText reimplements squashNewLines locally so it does not import formatUtil, which pulls in dayjs. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/user-generated-text/ServerUserGeneratedText.tsx#L27))

### `src/crypto-shim.ts`

- crypto-shim stands in for Node crypto in the browser because tweetnacl, ulid and noble only use it as a fallback; aliasing crypto-browserify shipped ~350 KB that never ran. It maps randomness to Web Crypto and throws for anything else. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/crypto-shim.ts#L3))
- crypto-shim chunks randomBytes into 65536-byte requests because getRandomValues rejects larger requests. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/crypto-shim.ts#L13))

### `src/pages/contest-page/ContestPage.test.tsx`

- ContestPage.test mocks the @audius/common/api hooks directly because priming nine hooks through the React Query cache is impractical; the test covers rendering only, and follow behaviour is tested elsewhere. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/ContestPage.test.tsx#L11))

### `src/pages/contest-page/components/ContestCommentsSection.test.tsx`

- ContestCommentsSection tests distinguish fan and artist compose modes by the submit label (Post vs Post Update) instead of Harmony's floating placeholder, which is unreliable to query. ([L151](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsSection.test.tsx#L151))
- ContestCommentsSection tests match the exact-case 'Post Update' badge text because the subheading 'Post updates from the artist' would match a case-insensitive regex. ([L267](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsSection.test.tsx#L267))

### `src/pages/fan-club-detail-page/FanClubDetailPage.test.tsx`

- FanClubDetailPage tests scope button queries to the balance section because the fan feed composer also exposes a Send control. ([L232](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-club-detail-page/FanClubDetailPage.test.tsx#L232))

### `src/pages/profile-page/ProfilePage.test.tsx`

- ProfilePage tests match the user name heading with a trailing-whitespace regex because the mobile header renders the name with a trailing space. ([L115](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/ProfilePage.test.tsx#L115))

### `src/pages/something-wrong/SomethingWrong.tsx`

- SomethingWrong selects the UI error code with an always-equal comparator so the displayed error stays fixed for the mount even if the store changes. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/something-wrong/SomethingWrong.tsx#L29))

### `src/services/query-client.ts`

- queryClient uses a custom QueryCache with onError because that is the only way to install a default query error handler in tanstack query. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/query-client.ts#L6))
- queryClient uses defaultRetryConfig to disable tanstack query's default retrying on 4xx errors like 404s. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/query-client.ts#L15))

### `src/services/remote-config/remote-config-instance.ts`

- remote-config createOptimizelyClient waits for OPTIMIZELY_LOADED when the datafile is missing because the Optimizely script tag can be async or deferred. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/remote-config/remote-config-instance.ts#L24))
- remote-config dynamically imports the Optimizely SDK so it stays out of the entry chunk. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/remote-config/remote-config-instance.ts#L39))
- remote-config passes a no-op setLogLevel because the Optimizely SDK is lazy-loaded and its log level is set in createOptimizelyClient instead. ([L62](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/remote-config/remote-config-instance.ts#L62))

### `src/ssr/legal/legal.test.tsx`

- ssr/legal legal.test uses a filesystem path because Vite rewrites new URL(..., import.meta.url) into an asset URL in the browser test environment. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/legal/legal.test.tsx#L35))

### `src/store/configureStore.ts`

- configureStore shares a stdChannel with lazily loaded sagas so they can receive actions dispatched before they started. ([L79](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/configureStore.ts#L79))

### `src/store/persistStorage.ts`

- store/persistStorage copies redux-persist keys from the old localforage (IndexedDB) store into localStorage once, loading localforage only for that copy. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/persistStorage.ts#L3))
- store/persistStorage checks for the localforage IndexedDB database first so new visitors with nothing to migrate never load localforage. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/persistStorage.ts#L16))

### `src/store/reachability/sagas.ts`

- store/reachability reachabilityPollingDaemon has no native equivalent because mobile updates reachability through an event listener. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/reachability/sagas.ts#L81))

### `src/store/sign-out/sagas.ts`

- sign-out saga calls queryClient.resetQueries() before clear() because clear() alone does not rerender active queries. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/sign-out/sagas.ts#L30))
- sign-out saga calls queryClient.resetQueries() before clear() because clear() alone does not rerender active queries. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/sign-out/sagas.ts#L34))

### `src/store/storeContext.ts`

- storeContext lazily imports the mock audiusSdk only in tests because it imports vitest, which cannot run in the browser. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/storeContext.ts#L60))

### `src/test/msw/mswMocks.ts`

- mswMocks sets wallet address query data before account data because useCurrentAccount is disabled until it exists. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/test/msw/mswMocks.ts#L54))

### `src/test/test-utils.tsx`

- test-utils getElementError strips the DOM output from Testing Library errors because it floods the console without helping. ([L141](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/test/test-utils.tsx#L141))
- test-utils it() wrapper saves the DOM in the catch block before Testing Library cleanup clears it. ([L217](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/test/test-utils.tsx#L217))

### `src/test/vitest-setup.ts`

- vitest-setup mocks @reown/appkit/react following the WalletConnect discussion because the real module fails in tests. ([L50](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/test/vitest-setup.ts#L50))

### `src/types/butterchurn-preset-packs.d.ts`

- butterchurn type declaration models import('butterchurn') resolving to { default: Butterchurn } under UMD/Vite. ([L2](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/types/butterchurn-preset-packs.d.ts#L2))

### `src/types/emotion.d.ts`

- types/emotion.d.ts redeclares global JSX interfaces so Emotion works with React 19's JSX types. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/types/emotion.d.ts#L9))

### `src/utils/hmr/errorHmrHandler.ts`

- errorHmrHandler closes the Something Wrong error page after a Vite HMR update, since the error state would otherwise persist after the fix. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/hmr/errorHmrHandler.ts#L9))

### `src/utils/route.ts`

- utils/route.ts defines route helpers locally instead of importing @audius/common's route utils, which pull in formatUtil and dayjs. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/route.ts#L10))

### `src/utils/sagaHelpers.ts`

- sagaHelpers waitForWrite does not ensure the account exists; operations needing one must call ensureLoggedIn afterwards. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/sagaHelpers.ts#L10))

### `vite.config.ts`

- vite.config points older same-major @noble/curves and @noble/ciphers copies at one canonical copy; newer copies are never downgraded and @noble/hashes is excluded because its \_assert exports changed within 1.x. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L21))
- vite.config stripHarmonyFonts drops Harmony's ~240 KB base64-inlined Avenir CSS because web serves the same fonts as woff2 from public/fonts.css. ([L94](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L94))
- vite.config svgoConfig mirrors mobile's react-native-svg-transformer settings plus id handling safe for many inlined SVGs on one page. ([L123](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L123))
- vite.config svgo keeps viewBox because SVGs are resized with CSS. ([L132](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L132))
- vite.config svgo disables convertColors so .svgrrc replaceAttrValues still match the exact color strings. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L134))
- vite.config svgo disables id minification/removal because minified ids collide between SVGs inlined on the same page. ([L137](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L137))
- vite.config svgo disables convertToQ, makeArcs and convertTransform because the rewrites visibly distort logos with tiny-scale image transforms. ([L142](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L142))
- vite.config loadEnv just mirrors process.env because turbo scripts set env via env-cmd instead of --mode; only vitest uses mode 'test' to load .env.test. ([L153](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L153))
- vite.config forces VITE_ENVIRONMENT=development in test mode so tests never fall back to production. ([L165](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L165))
- vite.config dynamically imports src/services/env after setting VITE_ENVIRONMENT so its switch evaluates the right environment for index.html transforms. ([L170](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L170))
- vite.config manualChunks puts stable framework deps in a vendor chunk (object form, so it never imports back into entry) to stay cached across deploys; SSR keeps default chunking. ([L193](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L193))
- vite.config uses a custom workerscript plugin to import worker scripts as raw strings because the ?raw suffix breaks on mobile. ([L254](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L254))
- vite.config bip39-english-only plugin drops the non-English bip39 wordlists because keys only use English. ([L270](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L270))
- vite.config aliases chart.js to this package's v4 because the root also resolves v2 (protocol-dashboard) and the hoisted dayjs adapter would otherwise pick v2 and break. ([L325](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L325))
- vite.config aliases react/react-dom to the root copy outside SSR so only one React instance loads, avoiding ReactCurrentDispatcher errors. ([L330](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L330))
- vite.config lists path aliases manually because vite-tsconfig-paths cannot be used with vike. ([L357](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L357))
- vite.config aliases crypto to a small shim for the client because deps only fall back to Node crypto without Web Crypto; SSR keeps crypto-browserify. ([L382](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L382))
- vite.config aliases lodash to lodash-es so it can be tree-shaken. ([L390](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L390))
- vite.config test.exclude uses glob patterns because bare strings matched only top-level paths and nested examples/\*\*/node_modules tests ran under happy-dom and failed. ([L419](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vite.config.ts#L419))

### `vitest.ssr.config.ts`

- vitest.ssr.config.ts is a separate config because SSR tests do not need the browser app's providers, canvas mocks or SDK setup. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/vitest.ssr.config.ts#L5))
