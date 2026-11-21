# 0013. Playback on web

- Status: Accepted
- Date: 2026-11-21

## Context

Audio element handling, lineups, queue and the visualizer. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/app/web-player/PlaybackPersistence.tsx`

- PlaybackPersistence renders nothing and hosts the playback persistence hooks so play/pause and position updates do not re-render WebPlayer. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/web-player/PlaybackPersistence.tsx#L5))

### `src/common/store/playback/sagas.ts`

- playback sagas getStreamUrlAndTimeout cycles through the primary and all mirrors in phases, increasing the timeout each phase. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/playback/sagas.ts#L114))
- When offline on native mobile the playback saga plays directly because the engine serves the track from cache. ([L162](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/playback/sagas.ts#L162))
- setAudioListeners syncs redux play/pause to the audio element's events, since browser media controls can change playback outside redux. ([L443](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/playback/sagas.ts#L443))
- handleQueueAutoplay appends genre-matched recommendations only when nearing the end of a queue that is not shuffled or repeating. ([L632](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/playback/sagas.ts#L632))

### `src/components/cast-button/CastButton.tsx`

- CastButton tracks an optimistic pickedCast flag because the audio is routed through an AudioContext and audio.remote.state does not reliably become connected for tab-casting. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/cast-button/CastButton.tsx#L16))
- CastButton labels the picker AirPlay on Safari and Cast on Chromium because remote.prompt() opens different pickers per browser. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/cast-button/CastButton.tsx#L24))
- RemotePlayback has no programmatic disconnect, so CastButton re-opens the native picker, which offers Stop casting. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/cast-button/CastButton.tsx#L53))

### `src/components/cast-button/useRemotePlayback.ts`

- useRemotePlayback uses webkitShowPlaybackTargetPicker and the webkit wireless-changed event on Safari, and the standard RemotePlayback API on Chromium. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/cast-button/useRemotePlayback.ts#L40))
- useRemotePlayback retries attaching on the next tick because AudioPlayer creates the audio element lazily. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/cast-button/useRemotePlayback.ts#L95))
- useRemotePlayback calls webkitShowPlaybackTargetPicker synchronously in the click handler since Safari requires a direct user gesture. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/cast-button/useRemotePlayback.ts#L138))

### `src/components/edit-track/components/PreviewButton.tsx`

- PreviewButton treats readyState >= 2 (HAVE_CURRENT_DATA) as playable, otherwise waits for canplay. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit-track/components/PreviewButton.tsx#L35))

### `src/components/follow-artist-card/selectArtistsPreviewContext.tsx`

- The select-artists preview fetches an artist's top 3 tracks to find one playable track. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/follow-artist-card/selectArtistsPreviewContext.tsx#L42))
- The select-artists preview checks the playing track's owner matches the artist because rerenders can happen before the next track starts. ([L113](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/follow-artist-card/selectArtistsPreviewContext.tsx#L113))

### `src/components/lineup/TrackLineup.tsx`

- TrackLineup uses a 1600px fallback load-more threshold until the scroll parent is measured, then LOAD_MORE_VIEWPORTS times its height. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L32))
- TrackLineup triggers the next page two viewports ahead so fast desktop fling scrolls see skeletons before reaching the bottom. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L37))
- TrackLineup only receives track IDs; tiles read full track data from the tanquery cache that the producing hook primed. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L48))
- TrackLineup's tileVariant='row' only applies on desktop; narrow and mobile layouts keep the tile. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L78))
- TrackLineup builds the playback queue from track entries only; collection tiles drive their own playback through the playback slice. ([L185](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L185))
- TrackLineup casts its opaque source string to QueueSource because it matches well-known QueueSource values and the saga treats it as a string. ([L268](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L268))
- TrackLineup sets a synchronous isLoadMoreTriggered flag so skeletons render next frame without waiting for tanquery's isFetching round trip. ([L328](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L328))
- TrackLineup uses an IntersectionObserver on a 1px sentinel below the last tile so the load-more trigger is immune to scrollHeight changes from skeletons. ([L351](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L351))
- TrackLineup keys skeletons by absolute position so a reused skeleton node doesn't show a changing order number when pages resolve. ([L383](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L383))
- TrackLineup renders a stable persistent skeleton block (at least 10) below loaded tiles so scrollHeight grows monotonically and the scrollbar thumb stays stable. ([L479](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L479))

### `src/components/now-playing/NowPlaying.tsx`

- NowPlaying keeps an extra mediaKey to refresh the scrubber when mobile seek position and UI seek position drift. ([L169](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/now-playing/NowPlaying.tsx#L169))
- NowPlaying includes duration in the Scrubber mediaKey because the play counter can update before the native layer reports duration. ([L477](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/now-playing/NowPlaying.tsx#L477))

### `src/components/play-bar/mobile/PlayBar.tsx`

- PlayBarTrackingBar syncs on play/track change and keeps polling while paused to pick up seeks; unchanged percent doesn't render. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/mobile/PlayBar.tsx#L64))

### `src/components/queue-popover/MiniTrackTile.tsx`

- MiniTrackTile's showGrip icon is decorative; the drag handler is bound by the parent on the outer wrapper. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/queue-popover/MiniTrackTile.tsx#L30))

### `src/components/track/desktop/CollectionTile.tsx`

- CollectionTile returns null for deactivated owners as a failsafe; lineups should already filter them. ([L488](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/CollectionTile.tsx#L488))

### `src/components/track/desktop/TrackRowTile.tsx`

- TrackRowTile keeps the same props contract as the desktop TrackTile so lineups can swap the two. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackRowTile.tsx#L53))

### `src/components/track/desktop/TrackTileWaveform.tsx`

- TrackTileWaveform only allows seeking on the full stream, not a gated preview. ([L180](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackTileWaveform.tsx#L180))
- TrackTileWaveform holds a pending seek until the track is active on the new audio element, because the player marks the track active before swapping in the element for the resolved stream URL, so an early seek lands on the old element. ([L214](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackTileWaveform.tsx#L214))

### `src/hooks/usePlaybackPositionPersistence.ts`

- usePlaybackPositionPersistence batches playback position writes to localStorage every 5s because positions change every second, and flushes when the page is hidden. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/usePlaybackPositionPersistence.ts#L20))

### `src/pages/collection-page/useCollectionPage.ts`

- useCollectionPage uses playback source 'COLLECTION_TRACKS' to match the legacy collectionPageLineupActions prefix, because PlaylistLibrary highlighting keys off the queue source. ([L515](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/collection-page/useCollectionPage.ts#L515))

### `src/pages/library-page/hooks/useLibraryPage.ts`

- useLibraryPage uses playback source 'SAVED_TRACKS' to match the legacy lineup prefix because consumers like mobile offline download status compare against it. ([L352](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/hooks/useLibraryPage.ts#L352))

### `src/pages/visualizer/Visualizer.tsx`

- Visualizer intentionally does not bind Space because it conflicts with the global play/pause hotkey. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/visualizer/Visualizer.tsx#L72))

### `src/services/audio-player/AudioPlayer.ts`

- AudioPlayer assigns its audio element to window.audio so third-party integrations can interact with playback. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audio-player/AudioPlayer.ts#L66))
- AudioPlayer.load removes and recreates the audio element because Chrome breaks when tracks are played quickly in succession on the same element. ([L129](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audio-player/AudioPlayer.ts#L129))
- AudioPlayer.load removes listeners before setting src to empty so clearing src does not fire an error event. ([L132](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audio-player/AudioPlayer.ts#L132))
- AudioPlayer.play removes the pending fade-out pause listener first so a not-yet-finished pause fade does not pause playback after it resumes. ([L227](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audio-player/AudioPlayer.ts#L227))
- AudioPlayer reconnects/disconnects the WebAudio source node on Chrome-like browsers instead of plain play/pause because backgrounding the tab otherwise resumes at about 0.9x speed; suspend/resume would freeze the visualizer analyser. ([L241](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audio-player/AudioPlayer.ts#L241))
- AudioPlayer rewinds currentTime by the fade-out duration after pausing so the position does not jump forward on resume. ([L359](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/audio-player/AudioPlayer.ts#L359))

### `src/utils/visualizer/butterchurnVisualizer.ts`

- butterchurnVisualizer keeps a singleton canvas and only dynamically imports butterchurn when bind/show is called. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/visualizer/butterchurnVisualizer.ts#L1))
- butterchurnVisualizer tracks boundAudioContext and recreates the visualizer when the audio player's AudioContext changes. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/visualizer/butterchurnVisualizer.ts#L64))
- butterchurnVisualizer bumps bindGeneration so bind continuations waiting on the shared library load promise are invalidated when a newer bind starts. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/visualizer/butterchurnVisualizer.ts#L70))
