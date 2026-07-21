import {
  transformAndCleanList,
  userTrackMetadataFromSDK
} from '@audius/common/adapters'
import {
  primeTrackDataSaga,
  queryCurrentUserId,
  queryTrack,
  queryUser
} from '@audius/common/api'
import {
  Kind,
  Name,
  PlaybackSource as AnalyticsPlaybackSource,
  Track,
  UserTrackMetadata
} from '@audius/common/models'
import { IntKeys } from '@audius/common/services'
import {
  cacheActions,
  calculatePlayerBehavior,
  gatedContentSelectors,
  getContext,
  getSDK,
  playbackActions,
  playbackSelectors,
  QueueSource,
  reachabilitySelectors,
  RepeatMode,
  tracksSocialActions,
  trackPageSelectors
} from '@audius/common/store'
import {
  CASCADING_TIMEOUTS_MS,
  Genre,
  Nullable,
  actionChannelDispatcher,
  getTrackPreviewDuration,
  waitForAccount
} from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { EventChannel, eventChannel } from 'redux-saga'
import {
  call,
  delay,
  put,
  select,
  spawn,
  take,
  takeEvery,
  takeLatest
} from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { waitForWrite } from 'utils/sagaHelpers'

import errorSagas from './errorSagas'

const PLAYER_SUBSCRIBER_NAME = 'PLAYER'
const QUEUE_SUBSCRIBER_NAME = 'QUEUE'
const RECORD_LISTEN_SECONDS = 1
const RECORD_LISTEN_INTERVAL = 1000
const PAGINATE_THRESHOLD = 3

const {
  getCounter,
  getCurrentPlaybackTrack,
  getCurrentSource,
  getCurrentPlayerBehavior,
  getCurrentTrackId,
  getCollectionId,
  getFeedType,
  getOvershot,
  getPlaybackIndex,
  getPlaybackQueue,
  getPlaybackRate,
  getPlaybackRetryCount,
  getPlaying,
  getQuerySource,
  getRepeat,
  getShuffle,
  getTrackId,
  getUndershot,
  getLength
} = playbackSelectors

const { recordListen } = tracksSocialActions
const { getNftAccessSignatureMap } = gatedContentSelectors
const { getIsReachable } = reachabilitySelectors
const { getTrackId: getTrackPageTrackId } = trackPageSelectors

// ===== Engine: load + play the audio for a queued track =====

export const getMirrorStreamUrl = (
  track: Track,
  shouldPreview: boolean,
  retries: number
) => {
  const streamObj = shouldPreview ? track.preview : track.stream
  if (streamObj?.url) {
    if (streamObj.mirrors.length < retries) {
      return null
    }
    if (retries > 0) {
      const streamUrl = new URL(streamObj.url)
      streamUrl.hostname = new URL(streamObj.mirrors[retries - 1]).hostname
      return streamUrl.toString()
    }
  }
  return streamObj?.url ?? null
}

// Cascading: each phase tries primary + all mirrors with growing timeouts.
const getStreamUrlAndTimeout = (
  streamObj: { url?: string; mirrors?: string[] } | null | undefined,
  retries: number
): { url: string | null; timeoutMs: number } => {
  const defaultTimeout = CASCADING_TIMEOUTS_MS[2]
  if (!streamObj?.url) {
    return { url: null, timeoutMs: defaultTimeout }
  }
  const urls: string[] = [streamObj.url]
  const mirrors = streamObj.mirrors ?? []
  for (const mirror of mirrors) {
    try {
      const mirrorUrl = new URL(streamObj.url)
      mirrorUrl.hostname = new URL(mirror).hostname
      urls.push(mirrorUrl.toString())
    } catch {
      // no-op
    }
  }
  const urlsPerPhase = urls.length
  const maxRetries = urlsPerPhase * 3
  if (retries >= maxRetries) {
    return { url: urls[0], timeoutMs: defaultTimeout }
  }
  const phase = Math.floor(retries / urlsPerPhase)
  const urlIndex = retries % urlsPerPhase
  return { url: urls[urlIndex], timeoutMs: CASCADING_TIMEOUTS_MS[phase] }
}

function* watchPlay() {
  yield* takeLatest(
    playbackActions.play.type,
    function* (action: ReturnType<typeof playbackActions.play>) {
      const { trackId, playerBehavior, startTime, onEnd, retries } =
        action.payload ?? {}
      const audioPlayer = yield* getContext('audioPlayer')
      const isNativeMobile = yield getContext('isNativeMobile')
      const audiusBackendInstance = yield* getContext('audiusBackendInstance')

      const queueIndex = yield* select(getPlaybackIndex)

      if (trackId) {
        const track = yield* queryTrack(trackId)
        const isReachable = yield* select(getIsReachable)
        if (!track) return

        if (!isReachable && isNativeMobile) {
          // Offline playback on mobile — engine handles via cache.
          audioPlayer.play()
          yield* put(
            playbackActions.playSucceeded({ trackId, index: queueIndex })
          )
          return
        }

        yield* call(waitForWrite)
        const currentUserId = yield* call(queryCurrentUserId)
        const audiusSdk = yield* getContext('audiusSdk')
        const sdk = yield* call(audiusSdk)

        const nftAccessSignatureMap = yield* select(getNftAccessSignatureMap)
        const nftAccessSignature =
          nftAccessSignatureMap[track.track_id]?.mp3 ?? null

        let trackDuration = track.duration
        const { shouldSkip, shouldPreview } = calculatePlayerBehavior(
          track,
          playerBehavior
        )

        if (shouldSkip) {
          yield* put(playbackActions.next({}))
          return
        }
        if (shouldPreview) {
          trackDuration = getTrackPreviewDuration(track)
        }

        const streamObj = shouldPreview ? track.preview : track.stream
        const { url: contentNodeStreamUrl, timeoutMs: loadTimeoutMs } =
          streamObj?.url
            ? getStreamUrlAndTimeout(streamObj, retries ?? 0)
            : { url: null as string | null, timeoutMs: 30000 }

        const isLongFormContent =
          track.genre === Genre.Podcasts || track.genre === Genre.Audiobooks

        const createEndChannel = async (url: string, timeoutMs?: number) => {
          const endChannel = eventChannel((emitter) => {
            audioPlayer.load(
              trackDuration ||
                track.track_segments.reduce(
                  (duration, segment) =>
                    duration + parseFloat(segment.duration),
                  0
                ),
              () => {
                if (onEnd) {
                  const action = onEnd({})
                  if (action) emitter(action)
                }
                if (isLongFormContent) {
                  emitter({
                    type: 'playback-position/setTrackPosition',
                    payload: {
                      userId: currentUserId,
                      trackId,
                      positionInfo: { status: 'COMPLETED', playbackPosition: 0 }
                    }
                  })
                }
              },
              url,
              timeoutMs
            )
            return () => {}
          })
          return endChannel
        }

        let endChannel: EventChannel<any>
        if (contentNodeStreamUrl) {
          endChannel = yield* call(
            createEndChannel,
            contentNodeStreamUrl,
            loadTimeoutMs
          )
        } else {
          const { data, signature } = yield* call(
            audiusBackendInstance.signGatedContentRequest,
            { sdk }
          )
          const streamUrl = yield* call(
            [sdk.tracks, sdk.tracks.getTrackStreamUrl],
            {
              trackId: Id.parse(trackId),
              userId: OptionalId.parse(currentUserId),
              nftAccessSignature: nftAccessSignature
                ? JSON.stringify(nftAccessSignature)
                : undefined,
              userSignature: signature,
              userData: data,
              preview: shouldPreview ? true : undefined
            }
          )
          endChannel = yield* call(createEndChannel, streamUrl, undefined)
        }

        yield* spawn(actionChannelDispatcher, endChannel)

        yield* put(
          cacheActions.subscribe(Kind.TRACKS, [
            { uid: PLAYER_SUBSCRIBER_NAME, id: trackId }
          ])
        )

        if (isLongFormContent) {
          // Restore podcast/audiobook position if in progress.
          const playbackRate = yield* select(getPlaybackRate)
          audioPlayer.setPlaybackRate(playbackRate)
          const trackPlaybackInfo = yield* select((state: any) => {
            const positions =
              state.playbackPosition?.userId?.[String(currentUserId)]
                ?.trackPositions
            return positions?.[trackId]
          })
          if (trackPlaybackInfo?.status !== 'IN_PROGRESS') {
            yield* put({
              type: 'playback-position/setTrackPosition',
              payload: {
                userId: currentUserId,
                trackId,
                positionInfo: { status: 'IN_PROGRESS', playbackPosition: 0 }
              }
            })
          } else {
            audioPlayer.play()
            yield* put(
              playbackActions.playSucceeded({
                trackId,
                index: queueIndex,
                isPreview: shouldPreview
              })
            )
            yield* put(
              playbackActions.seekTo({
                seconds: trackPlaybackInfo.playbackPosition
              })
            )
            return
          }
        } else if (audioPlayer.getPlaybackRate() !== '1x') {
          audioPlayer.setPlaybackRate('1x')
        }
      }

      // Final: gate skip on access, then fire engine.
      const track = yield* queryTrack(trackId)
      const { shouldSkip, shouldPreview } = calculatePlayerBehavior(
        track,
        playerBehavior
      )
      if (shouldSkip) {
        yield* put(playbackActions.next({}))
      } else {
        if (startTime) audioPlayer.seek(startTime)
        audioPlayer.play()
        yield* put(
          playbackActions.playSucceeded({
            trackId,
            index: queueIndex,
            isPreview: shouldPreview
          })
        )
      }
    }
  )
}

function* watchPause() {
  yield* takeLatest(
    playbackActions.pause.type,
    function* (action: ReturnType<typeof playbackActions.pause>) {
      const onlySetState = action.payload?.onlySetState
      yield* put(playbackActions.setPlayingState({ playing: false }))
      const audioPlayer = yield* getContext('audioPlayer')
      if (onlySetState) return
      audioPlayer.pause()
    }
  )
}

function* watchStop() {
  yield* takeLatest(playbackActions.stop.type, function* () {
    const audioPlayer = yield* getContext('audioPlayer')
    audioPlayer.stop()
  })
}

function* watchReset() {
  yield* takeLatest(
    playbackActions.reset.type,
    function* (action: ReturnType<typeof playbackActions.reset>) {
      const { shouldAutoplay } = action.payload
      const audioPlayer = yield* getContext('audioPlayer')
      audioPlayer.seek(0)
      if (!shouldAutoplay) {
        audioPlayer.pause()
      } else {
        const playerTrackId = yield* select(getTrackId)
        const playerBehavior = yield* select(getCurrentPlayerBehavior)
        if (playerTrackId) {
          yield* put(
            playbackActions.play({
              trackId: playerTrackId,
              onEnd: playbackActions.next,
              playerBehavior
            })
          )
        }
      }
      yield* put(playbackActions.resetSucceeded({ shouldAutoplay }))
    }
  )
}

function* watchSeek() {
  const audioPlayer = yield* getContext('audioPlayer')
  yield* takeLatest(
    playbackActions.seekTo.type,
    function* (action: ReturnType<typeof playbackActions.seekTo>) {
      const { seconds } = action.payload
      const trackId = yield* select(getTrackId)
      audioPlayer.seek(seconds)
      if (trackId) {
        const track = yield* queryTrack(trackId)
        const currentUserId = yield* call(queryCurrentUserId)
        const isLongFormContent =
          track?.genre === Genre.Podcasts || track?.genre === Genre.Audiobooks
        if (isLongFormContent) {
          yield* put({
            type: 'playback-position/setTrackPosition',
            payload: {
              trackId,
              userId: currentUserId,
              positionInfo: {
                status: 'IN_PROGRESS',
                playbackPosition: seconds
              }
            }
          })
        }
      }
    }
  )
}

function* watchSetPlaybackRate() {
  const audioPlayer = yield* getContext('audioPlayer')
  yield* takeLatest(
    playbackActions.setPlaybackRate.type,
    function* (action: ReturnType<typeof playbackActions.setPlaybackRate>) {
      audioPlayer.setPlaybackRate(action.payload.rate)
    }
  )
}

const AudioEvents = Object.freeze({ PLAY: 'play', PAUSE: 'pause' })

function watchAudio(audio: HTMLAudioElement) {
  return eventChannel((emitter) => {
    const emitPlay = () => emitter(AudioEvents.PLAY)
    const emitPause = () => {
      if (!audio.ended) emitter(AudioEvents.PAUSE)
    }
    if (audio) {
      audio.addEventListener(AudioEvents.PLAY, emitPlay)
      audio.addEventListener(AudioEvents.PAUSE, emitPause)
    }
    return () => {
      if (audio) {
        audio.removeEventListener(AudioEvents.PLAY, emitPlay)
        audio.removeEventListener(AudioEvents.PAUSE, emitPause)
      }
    }
  })
}

// Engine play/pause emitted via the <audio> element (e.g. browser controls)
// — sync redux to whatever the engine actually did.
function* setAudioListeners() {
  const audioPlayer = yield* getContext('audioPlayer')
  const chan = yield* call(watchAudio, audioPlayer.audio)
  while (true) {
    const audioEvent = yield* take(chan)
    const playing = yield* select(getPlaying)
    if (audioEvent === AudioEvents.PLAY && !playing) {
      yield* put(playbackActions.setPlayingState({ playing: true }))
    } else if (audioEvent === AudioEvents.PAUSE && playing) {
      yield* put(playbackActions.setPlayingState({ playing: false }))
    }
  }
}

function* handleAudioBuffering() {
  const audioPlayer = yield* getContext('audioPlayer')
  const chan = eventChannel((emitter) => {
    audioPlayer.onBufferingChange = (isBuffering: boolean) => {
      emitter(playbackActions.setBuffering({ buffering: isBuffering }))
    }
    return () => {}
  })
  yield* spawn(actionChannelDispatcher, chan)
}

function* handleAudioErrors() {
  const audioPlayer = yield* getContext('audioPlayer')
  const chan = eventChannel<{ error: string; data: string }>((emitter) => {
    audioPlayer.onError = (error: string, data: string | Event) => {
      emitter({ error, data: data as string })
    }
    return () => {}
  })
  while (true) {
    const { error, data } = yield* take(chan)
    const trackId = yield* select(getTrackId)
    if (trackId) {
      const track = yield* queryTrack(trackId)
      const playerBehavior = yield* select(getCurrentPlayerBehavior)
      const retries = yield* select(getPlaybackRetryCount)
      const { shouldPreview } = calculatePlayerBehavior(track, playerBehavior)
      const streamObj = shouldPreview ? track?.preview : track?.stream
      const numUrls = 1 + (streamObj?.mirrors?.length ?? 0)
      const maxRetries = numUrls * 3
      if (streamObj?.url && maxRetries > retries) {
        yield* put(
          playbackActions.play({
            trackId,
            retries: retries + 1,
            onEnd: audioPlayer.onEnd ?? undefined
          })
        )
      } else {
        yield* put(
          playbackActions.error({
            error,
            trackId,
            info: data
          })
        )
      }
    }
  }
}

// Polls audio position to record a listen once playback crosses the threshold.
function* recordListenWorker() {
  const isNativeMobile = yield* getContext('isNativeMobile')
  if (isNativeMobile) return
  let lastSeenPlayCounter: Nullable<number> = null
  while (true) {
    const trackId = yield* select(getTrackId)
    const playCounter = yield* select(getCounter)
    const audioPlayer = yield* getContext('audioPlayer')
    const position = audioPlayer.getPosition() as number
    const newPlay = lastSeenPlayCounter !== playCounter
    if (newPlay && position > RECORD_LISTEN_SECONDS) {
      if (trackId) yield* put(recordListen(trackId))
      lastSeenPlayCounter = playCounter
    }
    yield* delay(RECORD_LISTEN_INTERVAL)
  }
}

// ===== Queue management: drive engine from playback queue events =====

function* maybePaginate(queueLen: number, index: number) {
  if (index + PAGINATE_THRESHOLD < queueLen) return
  const querySource = yield* select(getQuerySource)
  if (!querySource) return
  const queryClient = yield* getContext('queryClient')
  if (!queryClient) return
  try {
    yield* call([queryClient, queryClient.fetchQuery], {
      queryKey: querySource.queryKey
    })
  } catch {
    // Network / staleness errors shouldn't crash playback.
  }
}

// Issue a play action for whatever's at queue[index]. Used by playFrom,
// playTrackAt, next, previous.
function* playCurrent() {
  const current = yield* select(getCurrentPlaybackTrack)
  if (!current) return
  const queue = yield* select(getPlaybackQueue)
  const index = yield* select(getPlaybackIndex)
  yield* put(
    playbackActions.play({
      trackId: current.trackId,
      onEnd: playbackActions.next,
      playerBehavior: current.playerBehavior
    })
  )
  yield* call(maybePaginate, queue.length, index)
}

// Subscribe queue tracks to the cache and fire autoplay when nearing the end.
function* watchPlayFrom() {
  yield* takeLatest(
    playbackActions.playFrom.type,
    function* (action: ReturnType<typeof playbackActions.playFrom>) {
      const tracks = action.payload.tracks
      if (tracks.length === 0) return
      yield* put(
        cacheActions.subscribe(
          Kind.TRACKS,
          tracks.map((t) => ({ uid: QUEUE_SUBSCRIBER_NAME, id: t.trackId }))
        )
      )
      yield* call(playCurrent)
    }
  )
}

function* watchAddToQueue() {
  yield* takeEvery(
    playbackActions.addToQueue.type,
    function* (action: ReturnType<typeof playbackActions.addToQueue>) {
      yield* put(
        cacheActions.subscribe(
          Kind.TRACKS,
          action.payload.tracks.map((t) => ({
            uid: QUEUE_SUBSCRIBER_NAME,
            id: t.trackId
          }))
        )
      )
    }
  )
}

function* watchAppendPage() {
  yield* takeEvery(
    playbackActions.appendPage.type,
    function* (action: ReturnType<typeof playbackActions.appendPage>) {
      yield* put(
        cacheActions.subscribe(
          Kind.TRACKS,
          action.payload.tracks.map((t) => ({
            uid: QUEUE_SUBSCRIBER_NAME,
            id: t.trackId
          }))
        )
      )
    }
  )
}

function* watchPlayTrackAt() {
  yield* takeLatest(playbackActions.playTrackAt.type, function* () {
    yield* call(playCurrent)
  })
}

function* watchTogglePlay() {
  yield* takeLatest(playbackActions.togglePlay.type, function* () {
    const playing = yield* select(getPlaying)
    if (playing) {
      yield* put(playbackActions.play({}))
    } else {
      yield* put(playbackActions.pause({}))
    }
  })
}

// Recommendation autoplay: if we're near the end of a non-shuffle, non-repeat
// queue, append genre-matched recommendations so the user keeps listening.
function* handleQueueAutoplay({
  skip,
  ignoreSkip,
  track
}: {
  skip: boolean
  ignoreSkip: boolean
  track: Track | null | undefined
}) {
  const index = yield* select(getPlaybackIndex)
  if (index < 0) return
  const length = yield* select(getLength)
  const shuffle = yield* select(getShuffle)
  const repeatMode = yield* select(getRepeat)
  const source = yield* select(getCurrentSource)
  const trackPageException = source === QueueSource.TRACK_TRACKS && length === 1
  const isCloseToEndOfQueue = index + 2 >= length
  const isNotRepeating =
    repeatMode === RepeatMode.OFF ||
    (repeatMode === RepeatMode.SINGLE && (skip || ignoreSkip))

  if (
    !shuffle &&
    isNotRepeating &&
    isCloseToEndOfQueue &&
    !trackPageException
  ) {
    const trackPageTrackId = yield* select(getTrackPageTrackId)
    const trackPageExclusions =
      source === QueueSource.TRACK_TRACKS && trackPageTrackId
        ? [trackPageTrackId]
        : []
    const exclusionList = Array.from(
      new Set(
        track ? [...trackPageExclusions, track.track_id] : trackPageExclusions
      )
    )
    yield* waitForAccount()
    const userId = yield* call(queryCurrentUserId)
    yield* put(
      playbackActions.queueAutoplay({
        genre: track?.genre ?? '',
        exclusionList,
        currentUserId: userId
      })
    )
  }
}

// Inlined from the legacy `recommendation/sagas.ts` — autoplay was the only
// caller of `getRecommendedTracks`, so the helper saga has been folded in here.
function* fetchRecommendedAutoplayTracks(
  genre: string,
  exclusionList: number[],
  currentUserId: Nullable<number> | undefined
) {
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')
  const sdk = yield* getSDK()
  const { data } = yield* call([sdk.tracks, sdk.tracks.getRecommendedTracks], {
    genre,
    exclusionList,
    limit: remoteConfigInstance.getRemoteVar(IntKeys.AUTOPLAY_LIMIT) || 10,
    userId: OptionalId.parse(currentUserId)
  })
  const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)
  yield* call(primeTrackDataSaga, tracks)
  return tracks
}

function* watchQueueAutoplay() {
  yield* takeEvery(
    playbackActions.queueAutoplay.type,
    function* (action: ReturnType<typeof playbackActions.queueAutoplay>) {
      const { genre, exclusionList, currentUserId } = action.payload
      const isReachable = yield* select(getIsReachable)
      if (!isReachable) return
      const tracks: UserTrackMetadata[] = yield* call(
        fetchRecommendedAutoplayTracks,
        genre,
        exclusionList,
        currentUserId
      )
      const excludedTrackIds = new Set(exclusionList)
      const queue = yield* select(getPlaybackQueue)
      queue.forEach((entry) => {
        if (typeof entry.trackId === 'number')
          excludedTrackIds.add(entry.trackId)
      })
      const recommendedTracks = tracks
        .filter(({ track_id }) => !excludedTrackIds.has(track_id))
        .map(({ track_id }) => ({
          trackId: track_id,
          source: QueueSource.RECOMMENDED_TRACKS
        }))
      if (recommendedTracks.length === 0) return
      yield* put(playbackActions.addToQueue({ tracks: recommendedTracks }))
    }
  )
}

// Skip-deleted/owner-deactivated/locked tracks on next, then play current.
function* watchNext() {
  yield* takeEvery(
    playbackActions.next.type,
    function* (action: ReturnType<typeof playbackActions.next>) {
      const skip = action.payload?.skip
      const overshot = yield* select(getOvershot)
      if (overshot) {
        yield* put(playbackActions.reset({ shouldAutoplay: false }))
        return
      }

      const trackId = yield* select(getCurrentTrackId)
      const track = yield* queryTrack(trackId)
      const user = yield* queryUser(track?.owner_id)
      const doesUserHaveStreamAccess =
        !track?.is_stream_gated || !!track?.access?.stream

      if (
        track &&
        (track.is_delete ||
          user?.is_deactivated ||
          (!doesUserHaveStreamAccess && !track.preview_cid))
      ) {
        yield* put(playbackActions.next({ skip }))
        return
      }

      yield* call(handleQueueAutoplay, {
        skip: !!skip,
        ignoreSkip: false,
        track
      })

      if (track) {
        const repeatMode = yield* select(getRepeat)
        if (repeatMode === RepeatMode.SINGLE) {
          // Replay current via the engine directly to avoid re-running the
          // queue cycle.
          yield* call(playCurrent)
        } else {
          yield* call(playCurrent)
          const collId = yield* select(getCollectionId)
          const feedType = yield* select(getFeedType)
          yield* put(
            make(Name.PLAYBACK_PLAY, {
              id: `${trackId}`,
              source: AnalyticsPlaybackSource.PASSIVE,
              ...(collId ? { collectionId: collId } : {}),
              ...(feedType ? { feed_type: feedType } : {})
            })
          )
        }
      } else {
        yield* put(playbackActions.stop({}))
      }
    }
  )
}

function* watchPrevious() {
  yield* takeEvery(playbackActions.previous.type, function* () {
    const undershot = yield* select(getUndershot)
    if (undershot) {
      yield* put(playbackActions.reset({ shouldAutoplay: false }))
      return
    }
    const trackId = yield* select(getCurrentTrackId)
    const track = yield* queryTrack(trackId)
    const user = yield* queryUser(track?.owner_id)
    const doesUserHaveStreamAccess =
      !track?.is_stream_gated || !!track?.access?.stream
    if (
      track &&
      (track.is_delete ||
        user?.is_deactivated ||
        (!doesUserHaveStreamAccess && !track.preview_cid))
    ) {
      yield* put(playbackActions.previous())
      return
    }
    if (track) {
      yield* call(playCurrent)
      const collId = yield* select(getCollectionId)
      const feedType = yield* select(getFeedType)
      yield* put(
        make(Name.PLAYBACK_PLAY, {
          id: `${trackId}`,
          source: AnalyticsPlaybackSource.PASSIVE,
          ...(collId ? { collectionId: collId } : {}),
          ...(feedType ? { feed_type: feedType } : {})
        })
      )
    } else {
      yield* put(playbackActions.stop({}))
    }
  })
}

const sagas = () => [
  watchPlay,
  watchPause,
  watchStop,
  watchReset,
  watchSeek,
  watchSetPlaybackRate,
  setAudioListeners,
  handleAudioBuffering,
  handleAudioErrors,
  recordListenWorker,
  watchPlayFrom,
  watchPlayTrackAt,
  watchTogglePlay,
  watchAddToQueue,
  watchAppendPage,
  watchNext,
  watchPrevious,
  watchQueueAutoplay,
  errorSagas
]

export default sagas
