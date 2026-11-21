# 0005. Playback in common

- Status: Accepted
- Date: 2026-11-21

## Context

Queue, shuffle, position tracking, casting and playback analytics. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `api/tan-query/tracks/useUpdateTrack.ts`

- useUpdateTrack sets generatePreview when preview_start_seconds changes because the SDK only reslices the preview when asked; otherwise metadata updates but the old preview clip keeps streaming. ([L135](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useUpdateTrack.ts#L135))

### `models/Track.ts`

- Track.is_streamable is false when the API will not serve audio (deleted track or inactive owner) and undefined when the source does not populate it, so only explicit false means unplayable. ([L191](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/Track.ts#L191))

### `services/wallet-client/WalletClient.ts`

- WalletClient ERC-20 to SPL transfer leaves funds in Wormhole; the recurring jobs box indexes AudiusWormhole and auto-redeems, so the client only polls. ([L110](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/wallet-client/WalletClient.ts#L110))

### `store/cast/slice.ts`

- cast slice turnOff only clears state when the method matches the active one, so the AirPlay listener cannot clear a Chromecast session and vice versa. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/cast/slice.ts#L31))

### `store/pages/track/selectors.ts`

- getSourceSelector (pages/track/selectors.ts) returns a legacy-compatible `TRACK_TRACKS:<id>` source tag for the track-page queue. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/track/selectors.ts#L10))

### `store/playback-position/slice.ts`

- MAX_TRACK_POSITIONS_PER_USER (playback-position/slice.ts) caps remembered positions at 10 because resume is only useful for recent long-form content and an unbounded map bloats storage. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback-position/slice.ts#L24))
- initializePlaybackPositionState (playback-position/slice.ts) must only be dispatched when seeding state from local storage. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback-position/slice.ts#L32))
- setTrackPosition (playback-position/slice.ts) deletes then re-sets the key so it moves to the end of the insertion-ordered map, making the LRU trim drop oldest entries first. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback-position/slice.ts#L52))

### `store/playback/selectors.ts`

- getPlayingIndex/getTrackId (playback/selectors.ts) reflect loaded audio and lag queue[index] until playSucceeded, which tile-highlight comparisons rely on. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/selectors.ts#L39))
- makeGetCurrent (playback/selectors.ts) reads queue[index], which updates synchronously, so tile highlights stay stable during the load gap and rapid retaps don't double-dispatch playFrom. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/selectors.ts#L74))

### `store/playback/slice.ts`

- buildShufflePermutation (playback/slice.ts) pins the current index at position 0 so the playing track stays current when shuffle turns on. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L37))
- PlayPayload.trackId (playback/slice.ts) supports chat playback and natural track-end paths that don't know the queue index; the saga resolves the index from the trackId. ([L84](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L84))
- PausePayload.onlySetState (playback/slice.ts) only flips the playing flag without pausing the engine; mobile audio uses it to mirror engine events into redux. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L95))
- ReorderPayload.orderedIndices (playback/slice.ts) lists old indices in their new positions, e.g. [2,0,1] turns [A,B,C] into [C,A,B]. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L121))
- playTrackAt (playback/slice.ts) just sets the index because the queue is already in playable (possibly shuffled) order. ([L199](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L199))
- next (playback/slice.ts) keeps the same index under repeat-single only for natural track end; the next button passes skip=true to advance anyway. ([L236](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L236))
- addToQueue (playback/slice.ts) appends new tracks to shuffleOriginalQueue while shuffled, since they have no pre-shuffle position, and points their original indices there. ([L294](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L294))
- reorder (playback/slice.ts) moves shuffleOriginalIndices with their tracks but leaves shuffleOriginalQueue untouched since it remembers pre-shuffle order. ([L361](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/slice.ts#L361))

### `store/playback/types.ts`

- QueueSource (playback/types.ts) tags every queued track so mobile offline-download checks and PlaylistLibrary current-track highlighting can switch on it. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L39))
- QueueItem (playback/types.ts) identity is (trackId, source); tile-highlight callers also have the queue index. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L74))
- PlaybackTrack (playback/types.ts) identity is its queue index because the queue may hold duplicates. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L83))
- PlaybackTrack.source (playback/types.ts) is a free-form tag used for analytics, mobile offline-download checks, and PlaylistLibrary highlighting. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L87))
- PlaybackTrack.feedType (playback/types.ts) is stamped at queue time so passive plays report the feed view they came from even after the user switches tabs. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L95))
- PlaybackState.playingIndex/playingTrackId (playback/types.ts) are set on playSucceeded and lag queue[index] so the previous tile stays highlighted until the new track starts. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L114))
- PlaybackState.counter (playback/types.ts) increments on every new play so listen recording can distinguish a replay of the same track from a fresh one. ([L128](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L128))
- PlaybackState.shuffleOriginalQueue (playback/types.ts) holds the pre-shuffle queue, empty when off, and is kept in sync on add/remove/reorder so disabling shuffle restores a coherent order. ([L136](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L136))
- PlaybackState.shuffleOriginalIndices[i] (playback/types.ts) is queue[i]'s position in shuffleOriginalQueue while shuffled; empty otherwise. ([L140](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L140))
- PlaybackState.overshot (playback/types.ts) is set when next() is a no-op at end with repeat off; the saga uses it to reset instead of reloading, and it clears on play/advance. ([L149](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playback/types.ts#L149))

### `utils/constants.ts`

- MIN_BUFFERING_DELAY_MS (1s) delays buffering spinners so short buffers never show and buffer states do not flicker. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/constants.ts#L5))
- AUDIO_LOAD_TIMEOUT_MS is 30s to match the longest cascading timeout phase before the player tries the next mirror. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/constants.ts#L9))

### `utils/trackAvailability.ts`

- isTrackUnavailable treats a track as unavailable only when is_streamable === false (not every source sets it), skips deleted tracks which have their own treatment, and never hides a track from its owner. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/trackAvailability.ts#L10))

### `utils/uid.ts`

- makeStableUid returns the same UID for the same (kind, id, source) so a tile still matches its queue entry after remount; only use it where a track appears once, never in lineups that can repeat a track. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/uid.ts#L74))

### `utils/waveform.ts`

- resampleWaveformPeaks keeps each span's loudest of the node's 0-255 buckets and scales by the loudest bucket so quiet masters do not draw as a flat strip. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/waveform.ts#L29))
