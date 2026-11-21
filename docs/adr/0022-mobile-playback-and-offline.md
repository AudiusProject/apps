# 0022. Playback, downloads and offline on mobile

- Status: Accepted
- Date: 2026-11-21

## Context

Audio playback, queue handling, offline downloads and storage. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/app/App.tsx`

- PersistGate onBeforeLift resets playback before children render because child effects run before the parent and the PlayBar slide-up would show through the splash screen. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/App.tsx#L122))

### `src/components/audio/Airplay.tsx`

- Airplay dispatches setIsCasting with method 'airplay' because the route-change listener also fires when Chromecast takes over and must not clear chromecast state. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/Airplay.tsx#L61))

### `src/components/audio/AudioPlayer.tsx`

- AudioPlayer only resolves mirrors for tracks within RESOLVE_AHEAD/BEHIND of the start because each check costs HEAD requests; failures are re-resolved by the PlaybackError handler. ([L79](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L79))
- makeTrackData's isUpcoming flag means the track is not the one about to play, so its playback retry count is not reset. ([L253](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L253))
- AudioPlayer reads playing through playingRef so handleQueueIdxChange does not re-run (and re-skip) on every play/pause toggle. ([L455](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L455))
- handleQueueIdxChange bails when RNTP's queue does not yet match redux because handleQueueChange will load the right track once it runs. ([L464](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L464))
- queueIdxChangeJobRef holds the in-flight skip promise so handleTogglePlay awaits it before calling TrackPlayer.play. ([L485](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L485))
- On PlaybackQueueEnded AudioPlayer marks redux paused because otherwise playing stays true and the next play never reaches TrackPlayer.play. ([L660](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L660))
- When RNTP auto-advances, AudioPlayer can map its index directly to the redux queue because the redux queue is always stored in playable (shuffled) order. ([L673](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L673))

### `src/components/audio/GoogleCast.tsx`

- GoogleCast dispatches setIsCasting with method 'chromecast' so the reducer only clears state when Chromecast was active, mirroring Airplay.tsx. ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/GoogleCast.tsx#L88))

### `src/components/audio/RepeatListener.tsx`

- RepeatListener increments the playback counter manually when the position wraps in RepeatMode.Track because RNTP does not emit a new track event on repeat. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/RepeatListener.tsx#L16))

### `src/components/audio/constants.ts`

- RESTART_THRESHOLD_SEC means "previous" restarts the current track instead of going back once playback is past 3 seconds. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/constants.ts#L4))

### `src/components/audio/streamSignature.ts`

- MAX_SIGNATURE_AGE_MS is 12h, well under the nodes' 48h stream signature limit, because queued tracks are resolved up front and can sit for hours. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/streamSignature.ts#L1))
- isStreamSignatureFresh exists because track entities never go stale in the persisted query cache, so cached stream URLs can outlive their signature. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/streamSignature.ts#L5))

### `src/components/audio/useSavePodcastProgress.ts`

- useSavePodcastProgress TRACK_END_BUFFER must match AudioPlayer.tsx's "ended" threshold. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/useSavePodcastProgress.ts#L26))
- useSavePodcastProgress skips IN_PROGRESS for positions within TRACK_END_BUFFER of the end because AudioPlayer marks them COMPLETED in the same tick. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/useSavePodcastProgress.ts#L48))
- On PlaybackActiveTrackChanged, useSavePodcastProgress saves event.lastPosition against the closure's trackId because redux has not yet updated to the new track. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/useSavePodcastProgress.ts#L69))

### `src/components/connect-drawer/ConnectDrawer.tsx`

- handleSelectCastDevice mutes TrackPlayer before starting a Cast session because GoogleCast.tsx's CONNECTING mute fires async and AirPlay would briefly play in parallel. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/connect-drawer/ConnectDrawer.tsx#L121))

### `src/components/lineup-tile/CollectionTile.tsx`

- CollectionTile starts playback from the current track if not deleted, else the first non-deleted track, and does nothing when every track is deleted. ([L188](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup-tile/CollectionTile.tsx#L188))

### `src/components/lineup-tile/TrackTileMetrics.tsx`

- CommentMetric defaults playbackSource to 'lineup-comments' so AudioPlayer source comparisons never mistake a queue started from the comment drawer for a page-owned queue. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup-tile/TrackTileMetrics.tsx#L91))

### `src/components/lineup/TrackLineup.tsx`

- TrackLineup's querySource lets the playback saga fetch the next page when continuous playback nears the end of the queue. ([L104](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L104))
- TrackLineup inlines each collection's tracks into the playback queue in feed order so playlist/album tiles are playable and next/previous traverse them instead of skipping. ([L217](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L217))
- TrackLineup finds the start index within the tapped collection's queue segment because the same track id can appear more than once in the queue. ([L282](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L282))

### `src/components/now-playing-drawer/ActionsBar.tsx`

- ActionsBar opens comments with playbackSource 'comments' so play-from-comment goes through the playback slice with a generic source, not a lineup prefix. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/ActionsBar.tsx#L171))
- ActionsBar keeps the cast button enabled when reachable even with no Chromecast devices, since the drawer offers This Device and the AirPlay/Bluetooth picker; it disables only when offline with no devices. ([L237](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/ActionsBar.tsx#L237))

### `src/components/now-playing-drawer/CommentBubble.tsx`

- CommentBubble polls whole-second playback position twice a second so it follows seeks and the native player directly rather than the scrubber's own timer. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/CommentBubble.tsx#L28))

### `src/components/now-playing-drawer/PlayButton.tsx`

- PlayButton shows the buffering spinner only after a minimum delay so quick buffering does not flash the spinner. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/PlayButton.tsx#L64))

### `src/components/now-playing-drawer/TrackingBar.tsx`

- TrackingBar's mediaKey uniquely identifies a playback instance and must change when the same track is replayed so progress resets. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/TrackingBar.tsx#L43))

### `src/components/now-playing-drawer/WaveformScrubber.tsx`

- WaveformScrubber reads playback position once even when paused so reopening the drawer shows the real position. ([L94](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/WaveformScrubber.tsx#L94))

### `src/components/offline-downloads/DownloadStatusIndicator.tsx`

- DownloadStatusIndicator renders every non-inactive item as downloaded while offline, because offline mode only lists successfully downloaded content. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/offline-downloads/DownloadStatusIndicator.tsx#L36))

### `src/components/offline-placeholder/OfflinePlaceholder.tsx`

- OfflinePlaceholder's refresh waits at least 800ms alongside NetInfo.refresh(), which returns almost instantly, so the user sees the app took action. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/offline-placeholder/OfflinePlaceholder.tsx#L40))

### `src/components/queue-drawer/QueueDrawer.tsx`

- QueueDrawer handles lineup pages shaped { count, tracks } (remixes/contest lineup) as well as arrays; iterating the object directly crashed the drawer while a contest track played. ([L242](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/queue-drawer/QueueDrawer.tsx#L242))
- QueueDrawer only allows reordering tracks after the now-playing index, and relies on rendering the entire queue so list indices equal queue indices. ([L412](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/queue-drawer/QueueDrawer.tsx#L412))

### `src/components/scrubber/Scrubber.tsx`

- Scrubber's mediaKey identifies one playback instance and must change when the same track is replayed so the scrubber resets to zero. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/scrubber/Scrubber.tsx#L31))

### `src/components/scrubber/Slider.tsx`

- Slider is split out of Scrubber and memoized so dragging updates external timestamps without re-rendering the Slider itself. ([L123](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/scrubber/Slider.tsx#L123))

### `src/screens/collection-screen/CollectionDownloadStatusRow.tsx`

- CollectionDownloadStatusRow resyncs its local switch state from isMarkedForDownload so removing or favoriting the collection elsewhere flips the switch. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/collection-screen/CollectionDownloadStatusRow.tsx#L81))

### `src/screens/collection-screen/CollectionScreenDetailsTile.tsx`

- useCollectionTrackUids derives collection track UIDs from the cached collection contents because stable UIDs are compared against the playing queue uid to highlight the current track. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/collection-screen/CollectionScreenDetailsTile.tsx#L68))
- CollectionScreenDetailsTile uses playback source 'COLLECTION_TRACKS' to match the legacy collection lineup prefix so consumers like the playlist library highlight keep working. ([L286](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/collection-screen/CollectionScreenDetailsTile.tsx#L286))

### `src/screens/library-screen/TracksTab.tsx`

- TracksTab uses playback source 'SAVED_TRACKS' to match the legacy saveTracksLineupActions prefix that AudioPlayer's source-based offline-download check relies on. ([L228](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/library-screen/TracksTab.tsx#L228))

### `src/screens/root-screen/RootScreen.tsx`

- RootScreen dispatches a player reset (no autoplay) on first mount so a crash cannot leak previous playback state into the next session (PAY-1412). ([L124](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/root-screen/RootScreen.tsx#L124))

### `src/screens/track-screen/TrackScreenDetailsTile.tsx`

- TrackScreenDetailsTile subscribes to the same useTrackPageLineup query as TrackScreenLineup (shared cache, no refetch) so the hero play button can queue related tracks, and disables it when offline to match the lineup's visibility gate. ([L349](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/track-screen/TrackScreenDetailsTile.tsx#L349))
- TrackScreenDetailsTile queues the hero with source 'TRACK_TRACKS' to match its makeStableUid in TrackScreen, and related tracks with 'TRACK_PAGE_MORE_BY' so the lineup tile highlights on auto-advance. ([L375](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/track-screen/TrackScreenDetailsTile.tsx#L375))

### `src/services/query-persister.ts`

- QUERY_CACHE_BUSTER in query-persister must be bumped whenever the persisted query shape changes incompatibly so old snapshots are dropped on next launch. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/query-persister.ts#L8))
- getReferencedEntityIds memoizes per dehydrate pass and clears the memo in a microtask, since dehydrate calls shouldDehydrateQuery synchronously for every query. ([L77](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/query-persister.ts#L77))

### `src/services/track-download.ts`

- track-download on iOS stages downloads in a temp location then presents the share sheet (zipping multi-file downloads first), and always deletes the temp files afterwards. ([L168](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L168))
- track-download on iOS stages downloads in a temp location then presents the share sheet (zipping multi-file downloads first), and always deletes the temp files afterwards. ([L180](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L180))
- track-download on iOS stages downloads in a temp location then presents the share sheet (zipping multi-file downloads first), and always deletes the temp files afterwards. ([L193](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L193))
- track-download on iOS stages downloads in a temp location then presents the share sheet (zipping multi-file downloads first), and always deletes the temp files afterwards. ([L294](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L294))
- track-download on iOS stages downloads in a temp location then presents the share sheet (zipping multi-file downloads first), and always deletes the temp files afterwards. ([L311](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L311))

### `src/store/offline-downloads/sagas/migrateOfflineDataPathSaga.ts`

- migrateOfflineDataPathSaga deletes the legacy downloads directory even on failure and requeues everything for download, so the migration isn't retried on every startup. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/sagas/migrateOfflineDataPathSaga.ts#L35))
- migrateOfflineDataPathSaga implements its own copyRecursive because neither RNFS nor react-native-blob-util provide recursive directory copy. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/sagas/migrateOfflineDataPathSaga.ts#L43))

### `src/store/offline-downloads/sagas/offlineQueueSagas/workers/downloadCollectionWorker.ts`

- downloadCollectionWorker special-cases the favorites download reason because favorites is not a real collection with metadata, so only its directory is created. ([L157](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/sagas/offlineQueueSagas/workers/downloadCollectionWorker.ts#L157))

### `src/store/offline-downloads/sagas/offlineQueueSagas/workers/downloadTrackWorker.ts`

- downloadTrackWorker prefers the v1 pre-signed stream URL with mirrors, matching the AudioPlayer's online streaming logic, and only builds a URL manually when stream.url is missing. ([L148](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/sagas/offlineQueueSagas/workers/downloadTrackWorker.ts#L148))

### `src/store/offline-downloads/sagas/offlineQueueSagas/workers/syncCollectionWorker.ts`

- syncCollectionWorker diffs collection track ids even when updated_at says nothing changed, because tracks are sometimes missing after the initial download. ([L182](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/sagas/offlineQueueSagas/workers/syncCollectionWorker.ts#L182))

### `src/store/offline-downloads/sagas/requestDownloadAllFavoritesSaga.ts`

- requestDownloadAllFavoritesSaga fetches all account collections first because AccountCollections don't include track lists. ([L79](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/offline-downloads/sagas/requestDownloadAllFavoritesSaga.ts#L79))

### `src/store/store.ts`

- getOrCreatePersistor creates the redux-persist persistor lazily so its first read happens after the AsyncStorage to MMKV migration; calling persistStore at module load would read an empty MMKV and wipe persisted state. ([L150](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/store.ts#L150))

### `src/utils/reachability.ts`

- pingTest treats the app as reachable when no REACHABILITY_URL is configured rather than reporting offline. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/reachability.ts#L25))
- updateReachability ignores NetInfo offline signals while the app isn't active (it rechecks on refocus) and confirms with its own ping before marking unreachable. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/reachability.ts#L49))
