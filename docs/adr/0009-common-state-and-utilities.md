# 0009. Redux state and shared utilities in common

- Status: Accepted
- Date: 2026-11-21

## Context

Redux store, sagas, modals, forms, formatting helpers and other shared plumbing. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `api/tan-query/coins/useFanClubMembers.ts`

- useFanClubMembers wraps toLocaleString in formatNumberCommas because the mobile JS runtime does not insert thousands separators. ([L100](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/coins/useFanClubMembers.ts#L100))

### `api/tan-query/developer-apps/useAddDeveloperApp.ts`

- useAddDeveloperApp strips the 0x prefix and lowercases the api key before createGrant because the grant API expects 40 bare hex chars while the API returns keys with 0x. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/developer-apps/useAddDeveloperApp.ts#L43))
- useAddDeveloperApp normalizes the new app's apiKey to no-0x lowercase so it matches the format of keys in the developer apps list. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/developer-apps/useAddDeveloperApp.ts#L61))

### `api/tan-query/users/useEmailInUse.ts`

- fetchEmailInUseForValidation returns an error message instead of throwing because zod-formik-adapter crashes on non-zod errors, and skips the request until the email is complete. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useEmailInUse.ts#L29))

### `api/tan-query/wallets/useAudioBalance.ts`

- In useAudioBalance getWalletBalances, queryClient.fetchQuery is wrapped in an async function because yield\* call([queryClient, queryClient.fetchQuery], ...) fails type checking. ([L280](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/wallets/useAudioBalance.ts#L280))

### `hooks/chats/useTrackPlayer.ts`

- usePlayTrack reads the current track via useStore().getState() inside the callback instead of useSelector so the callback identity does not change on every track change. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/chats/useTrackPlayer.ts#L48))

### `hooks/useFormattedCoinBalance.ts`

- useFormattedCoinBalance caps maximumFractionDigits at the token's decimals because FixedDecimal cannot format with more decimals than it was constructed with. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useFormattedCoinBalance.ts#L69))
- useFormattedCoinBalance wraps toLocaleString output in formatNumberCommas because on mobile (Hermes) toLocaleString does not insert thousands separators. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useFormattedCoinBalance.ts#L73))

### `hooks/useHarmonyField.ts`

- getEventTargetValue in useHarmonyField falls back to nativeEvent.text because React Native change events do not carry target.value. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useHarmonyField.ts#L14))
- useHarmonyField debouncedIdleMs only debounces this field's onChange validation; other fields still trigger undebounced form validation, so do not rely on it to throttle validation API calls unless every field uses it. Requires validateOnChange. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useHarmonyField.ts#L24))
- useHarmonyField.validateAndSetIdle only clears isChanging after setTouched's validation promise resolves, so errors do not show before validation finishes. ([L129](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useHarmonyField.ts#L129))
- useHarmonyField casts Formik setTouched/setValue results to Promise because Formik's types omit that validation is async. ([L135](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useHarmonyField.ts#L135))
- useHarmonyField onChangeText calls setValue(value, false) and awaits it instead of Formik onChange, to control validation timing and avoid Formik inferring the field name. ([L168](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useHarmonyField.ts#L168))
- useHarmonyField onChangeOverride compares input type directly for text-like inputs instead of relying on Formik executeChange's regex checks, routing them through onChangeText. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useHarmonyField.ts#L233))

### `hooks/useImageSize.ts`

- useImageSize reuses a cached larger image only up to MAX_LARGER_SIZE_RATIO (3.5x) the target width so small thumbnails do not decode full-size artwork. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useImageSize.ts#L31))
- useImageSize exposes priorityLowResUrl so callers can render the smaller cached image as a blurred backdrop while the high-res crossfades in, avoiding a flash on source change. ([L65](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useImageSize.ts#L65))
- useImageSize stores preloadImageFn in a ref because callers pass inline functions, which would otherwise re-run the effect and preload on every render. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useImageSize.ts#L72))
- When a smaller cached size exists, useImageSize sets the target URL immediately and passes the small one as priorityLowResUrl rather than swapping small then large, which caused an opacity-reset flash. ([L173](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useImageSize.ts#L173))
- useImageSize sets the target URL before the async fetchWithFallback resolves so the image renders from the native cache immediately instead of a gray placeholder, updating if a mirror is used. ([L191](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useImageSize.ts#L191))

### `hooks/useIsWaitingForValidation.ts`

- useIsWaitingForValidation tracks Formik isValidating going true then false, because Formik's isValidating is only true during validation and cannot be used to await validation results. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useIsWaitingForValidation.ts#L6))

### `models/OS.ts`

- The OS enum values (mac, win, linux) must match electron-builder's build platform names. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/OS.ts#L1))

### `models/Theme.ts`

- LEGACY_THEME_DEFAULT ('default') may still be stored from old clients and must be treated as ThemeMode.AUTO. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/Theme.ts#L34))

### `schemas/developerApps.ts`

- In developerApps.ts, api_access_keys (bearer tokens) are only present when the developer app is fetched with include=metrics. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/schemas/developerApps.ts#L32))

### `services/nice-modal-bridge/sagas.ts`

- nice-modal-bridge watchOpenViaCreateModal uses plain redux-saga takeEvery("\*") because typed-redux-saga typings and runtime do not reliably accept the wildcard. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/nice-modal-bridge/sagas.ts#L58))
- nice-modal-bridge maps close/closed actions to hideNiceModal only, since NiceModal owns its exit animation and calls remove automatically. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/nice-modal-bridge/sagas.ts#L70))

### `store/buy-usdc/sagas.ts`

- buy-usdc saga casts purchaseStep result because typed-redux-saga mistypes race effects (typed-redux-saga issue 43). ([L278](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/buy-usdc/sagas.ts#L278))

### `store/confirmer/sagas.ts`

- requestConfirmationAsync rechecks isDone after running completion calls since more calls may have been queued meanwhile. ([L144](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/confirmer/sagas.ts#L144))

### `store/confirmer/selectors.ts`

- getIsConfirming also returns true while uploading because uploads do not always use the confirmer but must block page unload. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/confirmer/selectors.ts#L7))

### `store/pages/chat/selectors.ts`

- getChats (chat/selectors.ts) returns the original array when no chat has an optimistic read so subscribers do not re-render on unrelated optimistic changes. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L78))
- The chat messages selector (chat/selectors.ts) returns the original array when no message has an optimistic reaction, avoiding re-renders and effects keyed on its identity. ([L107](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L107))

### `store/pages/history-page/reducer.ts`

- The history-page reducer is an empty stub kept after the tanquery migration so the combined pages reducer needs no special case. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/history-page/reducer.ts#L1))

### `store/reachability/reducer.ts`

- The reachability reducer defaults networkReachable to the truthy 'unconfirmed' to distinguish optimistic reachability from confirmed reachability. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/reachability/reducer.ts#L9))

### `store/ui/modals/reducers.ts`

- In store/ui/modals/reducers.ts, no-op reducers are registered for every initialState key so combineReducers keeps state for modals that have no createModal child reducer. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/modals/reducers.ts#L45))
- rootModalReducer runs the createModal child reducers first and then the legacy parent modal reducer, so modals created without createModal keep working alongside new ones. ([L104](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/modals/reducers.ts#L104))

### `store/ui/stripe-modal/types.ts`

- The Stripe session error class names its field stripeErrorMessage rather than message so it does not shadow Error.prototype.message. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/stripe-modal/types.ts#L75))

### `store/ui/toast/slice.ts`

- manualClearToast sets the toast timeout to 0 instead of removing it so the mobile Toast component animates out and then dismisses itself. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/toast/slice.ts#L36))

### `utils/formatUtil.ts`

- formatReleaseDate uses isSame(now, "day") to detect today rather than daysDifference === 0, because dayjs diff in days is 0 for any time within 24 hours, including tomorrow. ([L150](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/formatUtil.ts#L150))

### `utils/route.ts`

- WEEKLY_ROTATION_USER_PAGE lives under /explore/weekly-rotation/:handle so it cannot collide with /:handle/:slug track permalinks. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/route.ts#L35))
- orderedRoutes in utils/route.ts is ordered by increasing route selectivity because the app matches routes in that order. ([L289](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/route.ts#L289))

### `utils/urlUtils.ts`

- urlUtils safeDecodePath decodes pasted percent-encoded paths because the SDK re-encodes query params, and an already-encoded path would be double-encoded and the lookup would fail. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/urlUtils.ts#L27))
