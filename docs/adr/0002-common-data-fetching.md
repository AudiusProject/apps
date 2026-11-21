# 0002. Data fetching and caching in common

- Status: Accepted
- Date: 2026-11-21

## Context

How `packages/common` fetches, caches, paginates and optimistically updates data with TanStack Query and the SDK adapters. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `adapters/accessConditionsToSDK.ts`

- usdcPurchaseConditionsToSDK in adapters/accessConditionsToSDK.ts is for albums because album stream conditions can only be USDC purchase gates. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/accessConditionsToSDK.ts#L12))

### `adapters/activity.ts`

- normalizeActivityItem in adapters/activity.ts runs the SDK FromJSON because getRepostsByHandle items can arrive as raw snake_case JSON when the response discriminator is not applied. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/activity.ts#L16))

### `adapters/user.ts`

- userMetadataFromSDK in adapters/user.ts does not populate current-user/account fields because the Users API never returns them. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/user.ts#L36))
- userMetadataToSdk in adapters/user.ts coerces null name/handle/is_deactivated to undefined because the SDK schema rejects null and legacy DB rows have nulls, which broke profile save. ([L204](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/user.ts#L204))
- userMetadataToSdk in adapters/user.ts spreads profile_type, spl_usdc_payout_wallet and coin_flair_mint via pick to keep null at runtime, since null is meaningful (e.g. default badge) but the generated UpdateUserRequestBody type is wrongly non-nullable. ([L210](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/user.ts#L210))

### `api/tan-query/batchers/getEventsByEntityIdBatcher.ts`

- getEventsByEntityIdBatcher primes the useRemixesCount cache from the entryCounts returned with events so ContestCard badges do not fire a /tracks/{id}/remixes?limit=0 request per card. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/batchers/getEventsByEntityIdBatcher.ts#L24))

### `api/tan-query/coins/useUserCoins.ts`

- useUserCoins primes each useUserCoin cache entry from the bulk response so wallet rows do not each fire their own request. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/coins/useUserCoins.ts#L39))

### `api/tan-query/collection/useCollections.ts`

- useCollections memoizes on collectionIds.join(',') because callers often pass a new array each render, which would otherwise destabilize the queries. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/collection/useCollections.ts#L28))
- useCollections memoizes the useQueries config because rebuilding it every render makes TanStack re-hash every key and re-sync every observer. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/collection/useCollections.ts#L40))

### `api/tan-query/collection/useNewAlbumReleases.ts`

- useNewAlbumReleases passes the current userId so embedded album-owner users are personalized (does_current_user_follow); primeCollectionData writes them into the shared user cache, so unpersonalized users would poison it. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/collection/useNewAlbumReleases.ts#L42))

### `api/tan-query/events/useAllRemixContests.ts`

- useAllRemixContests passes the current userId so related users are personalized; otherwise they are primed un-personalized into the shared user cache. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useAllRemixContests.ts#L81))
- useAllRemixContests primes related tracks and users from the contests response so ContestCard's useTrack/useUser are cache hits and the grid paints in one round-trip. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useAllRemixContests.ts#L87))
- useAllRemixContests primes the useRemixesCount cache from entryCounts so ContestCard badges do not fire a count-only request per card. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useAllRemixContests.ts#L93))
- useAllRemixContests also primes the useEventIdsByEntityId key (entityId, Track, RemixContest) because useRemixContest resolves through it. ([L113](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useAllRemixContests.ts#L113))

### `api/tan-query/events/useUserRemixContests.ts`

- useUserRemixContests passes the viewer as query userId (path id is the host) so embedded related users are personalized before priming the shared cache. ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserRemixContests.ts#L88))
- useUserRemixContests primes related tracks and users so ContestCard's useTrack/useUser are cache hits and the grid paints in one round-trip. ([L94](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserRemixContests.ts#L94))
- useUserRemixContests primes the useRemixesCount cache from entryCounts so ContestCard badges do not fire a count-only request per card. ([L100](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserRemixContests.ts#L100))
- useUserRemixContests also primes the useEventIdsByEntityId key (entityId, Track, RemixContest) because useRemixContest resolves through it. ([L120](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserRemixContests.ts#L120))

### `api/tan-query/feed/useFeedPreferences.ts`

- useFeedTab in feed/useFeedPreferences.ts keeps the feed tab in the tan-query cache so every component reads the same value, with localStorage as durable storage. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/feed/useFeedPreferences.ts#L21))
- useFeedTab maps the old persisted 'CHRONOLOGICAL' value to FeedTab.LATEST so existing users keep their selected tab after the rename. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/feed/useFeedPreferences.ts#L34))

### `api/tan-query/jupiter/solanaUtils.ts`

- jupiter/solanaUtils.ts holds the swap helpers that need @solana/web3.js, kept apart from jupiter/utils.ts so the light helpers can be imported without loading web3.js. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/jupiter/solanaUtils.ts#L32))

### `api/tan-query/lineups/useFeed.ts`

- useFeed sets staleTime to 5 minutes so an immediate refetch on mount/focus can't replace a loaded feed with a transient empty result; not Infinity like useForYouFeed because the chronological feed should refresh when users return. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/lineups/useFeed.ts#L112))
- useFeed is enabled only when currentUserId != null; running it while the account is loading would cache [] under [feed, undefined] and briefly show 'no content'. ([L124](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/lineups/useFeed.ts#L124))

### `api/tan-query/lineups/useForYouFeed.ts`

- useForYouFeed reports isPending/isLoading as false when the query is disabled (no user or enabled false), because react-query leaves disabled queries pending forever and consumers would show an endless spinner. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/lineups/useForYouFeed.ts#L114))

### `api/tan-query/lineups/useTrackPageLineup.ts`

- useTrackPageLineup fires remix-parent, remixes and trending requests at once; trending is only shown when there are no remixes but fetching it up front saves a round trip in the common case. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/lineups/useTrackPageLineup.ts#L101))
- useTrackPageLineup attaches a no-op catch to trendingPromise so it only fails the query when it is actually awaited (no-remixes case), avoiding unhandled rejections otherwise. ([L129](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/lineups/useTrackPageLineup.ts#L129))
- usePrefetchTrackPageLineup is mounted above ScreenSecondaryContent's nav-animation gate so the lineup fetch starts as soon as the hero track and owner handle resolve, overlapping the push transition; it keeps a live observer so TrackScreenLineup reuses the data. ([L245](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/lineups/useTrackPageLineup.ts#L245))

### `api/tan-query/lineups/useWeeklyRotation.ts`

- useWeeklyRotation uses a 30-minute staleTime: the server recomputes weekly and caches for hours so refetching is cheap, and a bounded value (not Infinity) keeps a transient failure or empty response from sticking all session. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/lineups/useWeeklyRotation.ts#L17))

### `api/tan-query/notifications/useNotifications.ts`

- useNotifications sends userId as ?user_id= because the path id only identifies the notification owner; the backend needs the requester id to personalize related.users fields like does_current_user_follow. ([L80](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/notifications/useNotifications.ts#L80))

### `api/tan-query/purchases/useAudioTransactions.ts`

- DEFAULT_AUDIO_TRANSACTIONS_BATCH_SIZE in useAudioTransactions.ts must stay at or below 100 because /v1/users/{id}/transactions/audio caps limit at 100 server-side. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/useAudioTransactions.ts#L25))
- useAudioTransactions reads the latest query result from a ref inside a stable useCallback loadNextPage so the consuming Table's loadMoreRows identity doesn't change every render. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/useAudioTransactions.ts#L93))

### `api/tan-query/purchases/usePurchases.ts`

- PAGE_SIZE in usePurchases.ts is 50 to match the consumer Table's fetchBatchSize; at 10, InfiniteLoader cascaded 5 fetches to fill each 50-row batch. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/usePurchases.ts#L25))
- usePurchases reads the latest query result from a ref inside a stable useCallback loadNextPage so the consuming Table's loadMoreRows identity doesn't change every render. ([L109](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/usePurchases.ts#L109))

### `api/tan-query/purchases/useSales.ts`

- PAGE_SIZE in useSales.ts is 50 to match the consumer Table's fetchBatchSize; at 10, InfiniteLoader cascaded 5 fetches to fill each 50-row batch. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/useSales.ts#L25))
- useSales reads the latest query result from a ref inside a stable useCallback loadNextPage so the consuming Table's loadMoreRows identity doesn't change every render. ([L104](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/useSales.ts#L104))

### `api/tan-query/purchases/useUSDCTransactions.ts`

- useUSDCTransactions' isPolling defaults off because polling an infinite query refetches every loaded page each tick, which is expensive and visually disruptive; callers needing short-term polling (useWithdrawalTransactionPoller) manage it themselves. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/useUSDCTransactions.ts#L34))
- useUSDCTransactions reads the latest query result from a ref inside a stable useCallback loadNextPage so the consuming Table's loadMoreRows identity doesn't change every render. ([L143](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/useUSDCTransactions.ts#L143))
- useUSDCTransactions attaches reset/loadNextPage with Object.assign onto the query result instead of spreading it, so TanStack Query's tracked-property access (render optimization) keeps working. ([L153](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/purchases/useUSDCTransactions.ts#L153))

### `api/tan-query/remixes/useRemixes.ts`

- useRemixes getNextPageParam subtracts the prepended original track from the first page before comparing to pageSize so a full page of remixes doesn't stop pagination early. ([L106](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/remixes/useRemixes.ts#L106))
- useRemixes writes data.count into the remixes count query key so count-only consumers don't fire their own request once the lineup is loaded. ([L148](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/remixes/useRemixes.ts#L148))
- useRemixesCount fetches with limit=0 under its own key so useRemixes can keep the plain LineupData[] page shape that TrackLineup and playFrom's querySource require. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/remixes/useRemixes.ts#L171))

### `api/tan-query/remixes/useRemixesLineup.ts`

- useRemixesLineup reads the total from useRemixesCount, whose cache the lineup queryFn primes, so no extra round-trip once the lineup loads. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/remixes/useRemixesLineup.ts#L68))

### `api/tan-query/saga-utils/queryCollection.ts`

- queryCollections saga calls queryCollection per id because the queryFn batcher combines them into one request when needed. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/saga-utils/queryCollection.ts#L48))

### `api/tan-query/saga-utils/queryUser.ts`

- queryUsers saga runs queryUser calls in parallel (all) so the user batcher collects every id into a single request; sequential calls would defeat batching. ([L67](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/saga-utils/queryUser.ts#L67))

### `api/tan-query/search/useSearchResults.ts`

- useSearchResults widens bpm filters by +/-0.5 around rounded values because BPM is displayed rounded to whole numbers, so a displayed value must still match. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/search/useSearchResults.ts#L72))
- useSearchResults' getNextPageParam always returns the next offset for the ALL category because that category can't tell when it is out of pages. ([L299](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/search/useSearchResults.ts#L299))

### `api/tan-query/tracks/useSuggestedPlaylistTracks.ts`

- useSuggestedPlaylistTracks uses trending's isFetching (not isPending) so the effect re-runs after each loadNextPage, not just the first load. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useSuggestedPlaylistTracks.ts#L40))

### `api/tan-query/tracks/useTrackRank.ts`

- useGetTrendingIds uses a 30-minute staleTime because trending lists change slowly and every track page reads them for the rank badge. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useTrackRank.ts#L34))

### `api/tan-query/tracks/useTracks.ts`

- useTracks memoizes the deduped id list on ids.join(',') because callers often pass a new array each render, keeping the queries stable. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useTracks.ts#L28))
- useTracks memoizes the queries array because rebuilding it each render makes TanStack re-hash every key and re-sync every observer. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useTracks.ts#L38))

### `api/tan-query/tracks/useUpdateTrack.ts`

- useUpdateTrack skips the optimistic cache update when audio or image files are being uploaded because the new state can't be represented until the upload completes. ([L209](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useUpdateTrack.ts#L209))

### `api/tan-query/types.ts`

- FlatUseInfiniteQueryResult omits fields from UseInfiniteQueryResult whose types become wrong once select changes the output shape. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/types.ts#L56))

### `api/tan-query/users/account/useCurrentAccount.ts`

- useCurrentAccount caches the parsed placeholder account keyed on the raw localStorage strings because TanStack reruns placeholderData every render while pending and every entity hook observes this query. ([L62](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/account/useCurrentAccount.ts#L62))

### `api/tan-query/users/useFollowSuggestions.ts`

- useFollowSuggestions fetches featured artists in parallel with personalized suggestions so new accounts with no personalized results don't wait on two serial requests. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useFollowSuggestions.ts#L23))

### `api/tan-query/users/useUpdateProfile.ts`

- useUpdateProfile re-applies the mutation variables to the cache on success instead of the getUser response because the validator node answering may not have indexed the confirmed block yet. ([L85](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useUpdateProfile.ts#L85))

### `api/tan-query/users/useUserAlbums.ts`

- useUserAlbums reports pending while per-collection queries are still loading, since the id query resolves first and consumers would otherwise flash a 'no albums' state. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useUserAlbums.ts#L91))

### `api/tan-query/users/useUserPlaylists.ts`

- useUserPlaylists reports pending while per-collection queries are still loading, since the id query resolves first and consumers would otherwise flash a 'no playlists' state. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useUserPlaylists.ts#L91))

### `api/tan-query/users/useUsers.ts`

- useUsers memoizes the deduped id list on ids.join(',') because callers often pass a new array each render, keeping the queries stable. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useUsers.ts#L28))
- useUsers memoizes the queries array because rebuilding it each render makes TanStack re-hash every key and re-sync every observer. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useUsers.ts#L38))

### `api/tan-query/utils/QueryContext.ts`

- getQueryContext in tan-query/utils/QueryContext.ts uses the raw redux-saga getContext because the common typed getContext would create a circular import. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/QueryContext.ts#L76))

### `api/tan-query/utils/infiniteQueryLoadNextPage.ts`

- makeLoadNextPage guards against duplicate page loads (react-query has none) and returns the fetchNextPage promise, or undefined when nothing to fetch, which InfiniteLoader treats as no load in progress. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/infiniteQueryLoadNextPage.ts#L5))
- useLoadNextPage gives makeLoadNextPage a stable identity between page loads so lineups and lists taking it as a prop don't re-render on every parent render. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/infiniteQueryLoadNextPage.ts#L30))

### `api/types.ts`

- SDKRequest in api/types.ts omits encodedDataMessage/encodedDataSignature because SDK middleware supplies them, and adds currentUserId which callers convert and pass. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/types.ts#L3))
- SDKInfiniteQueryArgs omits userId (a hashed string in the SDK) so query keys use internal numeric IDs, and replaces limit/offset with pageSize for useInfiniteQuery. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/types.ts#L12))

### `services/audius-backend/solanaBackend.ts`

- solanaBackend.ts is a separate module so @solana/web3.js and @solana/spl-token load only when a Solana method is first used. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/audius-backend/solanaBackend.ts#L17))

### `store/cache/mergeCustomizer.ts`

- mergeCustomizer never merges forceUpdateKeys (field*visibility, followee*\*, stream_conditions...); the latest backend value always wins. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/cache/mergeCustomizer.ts#L3))
- mergeCustomizer keeps is_delete true once set; later updates cannot undelete in cache. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/cache/mergeCustomizer.ts#L26))
- mergeCustomizer replaces playlist_contents rather than merging because tracks may be removed, but preserves existing UIDs since new fetches lack them. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/cache/mergeCustomizer.ts#L35))
- mergeCustomizer maps playlist tracks by id to arrays because a playlist can contain the same track id multiple times. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/cache/mergeCustomizer.ts#L40))

### `store/cache/users/utils.ts`

- reformatUser sets display name to handle when empty because sign-up can create the account but fail the set-name transaction. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/cache/users/utils.ts#L20))
- reformatUser must always be called before a user is cached. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/cache/users/utils.ts#L33))

### `store/pages/chat/sagas.ts`

- doFetchLatestChats (chat/sagas.ts) advances using the response's prev_cursor so subsequent pages walk newer chats, mirroring doFetchLatestMessages. ([L200](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L200))
- doFetchLatestMessages (chat/sagas.ts) falls back to doFetchMoreMessages on first fetch, since there is no after cursor yet, to load everything up to the first unread. ([L274](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L274))

### `store/pages/chat/slice.ts`

- fetchMoreChatsSucceeded (chat/slice.ts) updates the next summary when next_count is 0 or the cursor advances; trusting count 0 is needed because exhausted pages can return a null cursor. ([L292](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L292))
- fetchMoreMessagesSucceeded (chat/slice.ts) keeps max next_cursor and min prev_cursor and honors count 0 as end-of-pagination since exhausted pages may return null cursors. ([L370](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L370))

### `store/sdkUtils.ts`

- sdkUtils.ts defines AudiusSDKContext locally instead of importing storeContext, because importing that module creates circular dependencies. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/sdkUtils.ts#L4))

### `store/storeContext.ts`

- CommonStoreContext.sagaChannel (storeContext.ts) is the saga middleware channel used to replay actions to lazily loaded sagas. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/storeContext.ts#L70))

### `store/ui/buy-sell/types.ts`

- CoinInfo.icon (buy-sell/types.ts) is optional to avoid circular dependencies with icon components. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/buy-sell/types.ts#L14))

### `store/user-list/reducer.ts`

- The user-list reducer resets to initial state if SET_PAGE_SIZE arrives after page 0, because changing page size mid-pagination is unsupported. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/user-list/reducer.ts#L66))

### `store/wallet/utils.ts`

- isValidSolAddress checks that the base58 string decodes to 32 bytes (same as new PublicKey) so validating an address does not pull @solana/web3.js into the bundle. ([L105](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/wallet/utils.ts#L105))

### `utils/lazySagas.ts`

- lazySagas replays buffered actions directly onto the saga middleware stdChannel (SAGA_CHANNEL_CONTEXT_KEY) so newly started sagas see them without running the reducers a second time. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/lazySagas.ts#L32))
- Every watcher in a module loaded via lazySagas must register take/takeEvery/takeLatest synchronously when started, otherwise it misses the replay of buffered actions. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/lazySagas.ts#L39))
- If loading a lazySagas module fails (likely a chunk download failure), the loader flushes queued actions and retries on the next matching action instead of crashing. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/lazySagas.ts#L59))

### `utils/passwordListLazyLoader.native.ts`

- passwordListLazyLoader.native.ts stubs the common-password list because React Native cannot code-split it, so the 172 KB list would ship in every bundle and OTA; native relies only on the Have I Been Pwned check. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/passwordListLazyLoader.native.ts#L1))

### `utils/sagaHelpers.ts`

- sagaHelpers.ts imports getAccountStatusQueryKey from its exact file path rather than a barrel so the SSR bundle does not pull in the rest of tan-query. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/sagaHelpers.ts#L9))
