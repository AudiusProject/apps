import { queryCurrentUserId, queryTrack } from '@audius/common/api'
import { Kind, type Track, Feature } from '@audius/common/models'
import {
  cacheActions,
  queueActions,
  reachabilitySelectors,
  tracksSocialActions,
  getContext,
  playerActions,
  playerSelectors,
  playbackPositionActions,
  playbackPositionSelectors,
  gatedContentSelectors,
  calculatePlayerBehavior,
  queueSelectors
} from '@audius/common/store'
import {
  Genre,
  actionChannelDispatcher,
  getTrackPreviewDuration,
  Nullable
} from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { EventChannel, eventChannel } from 'redux-saga'
import {
  take,
  call,
  put,
  spawn,
  takeLatest,
  delay,
  select
} from 'typed-redux-saga'

import { waitForWrite } from 'utils/sagaHelpers'

import errorSagas from './errorSagas'

const { setTrackPosition } = playbackPositionActions
const { getTrackPosition } = playbackPositionSelectors
const {
  play,
  playSucceeded,
  pause,
  stop,
  setBuffering,
  reset,
  resetSucceeded,
  seek,
  setPlaybackRate,
  error: errorAction
} = playerActions

const {
  getTrackId,
  getUid,
  getCounter,
  getPlaying,
  getPlaybackRate,
  getPlaybackRetryCount
} = playerSelectors
const { getPlayerBehavior } = queueSelectors

const { recordListen } = tracksSocialActions
const { getNftAccessSignatureMap } = gatedContentSelectors
const { getIsReachable } = reachabilitySelectors

const PLAYER_SUBSCRIBER_NAME = 'PLAYER'
const RECORD_LISTEN_SECONDS = 1
const RECORD_LISTEN_INTERVAL = 1000

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

export function* watchPlay() {
  yield* takeLatest(play.type, function* (action: ReturnType<typeof play>) {
    const { uid, trackId, playerBehavior, startTime, onEnd, retries } =
      action.payload ?? {}

    const audioPlayer = yield* getContext('audioPlayer')
    const isNativeMobile = yield getContext('isNativeMobile')
    const audiusBackendInstance = yield* getContext('audiusBackendInstance')

    if (trackId) {
      // Load and set end action.
      const track = yield* queryTrack(trackId)

      const isReachable = yield* select(getIsReachable)

      if (!track) return

      if (!isReachable && isNativeMobile) {
        // Play offline.
        audioPlayer.play()
        yield* put(playSucceeded({ uid, trackId }))
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
        yield* put(queueActions.next({}))
        return
      }

      if (shouldPreview) {
        trackDuration = getTrackPreviewDuration(track)
      }

      const contentNodeStreamUrl = getMirrorStreamUrl(
        track,
        shouldPreview,
        retries ?? 0
      )

      const createEndChannel = async (url: string) => {
        const endChannel = eventChannel((emitter) => {
          audioPlayer.load(
            trackDuration ||
              track.track_segments.reduce(
                (duration, segment) => duration + parseFloat(segment.duration),
                0
              ),
            () => {
              if (onEnd) {
                emitter(onEnd({}))
              }
              if (isLongFormContent) {
                emitter(
                  setTrackPosition({
                    userId: currentUserId,
                    trackId,
                    positionInfo: {
                      status: 'COMPLETED',
                      playbackPosition: 0
                    }
                  })
                )
              }
            },
            url
          )
          return () => {}
        })
        return endChannel
      }

      let endChannel: EventChannel<any>
      // If we have a stream URL from API already for content node, use that.
      // If not, we might need the NFT gated signature, so fallback to the API stream endpoint.
      if (contentNodeStreamUrl) {
        endChannel = yield* call(createEndChannel, contentNodeStreamUrl)
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
        endChannel = yield* call(createEndChannel, streamUrl)
      }

      const isLongFormContent =
        track.genre === Genre.PODCASTS || track.genre === Genre.AUDIOBOOKS

      yield* spawn(actionChannelDispatcher, endChannel)

      yield* put(
        cacheActions.subscribe(Kind.TRACKS, [
          { uid: PLAYER_SUBSCRIBER_NAME, id: trackId }
        ])
      )

      if (isLongFormContent) {
        // Make sure that the playback rate is set when playing a podcast
        const playbackRate = yield* select(getPlaybackRate)
        audioPlayer.setPlaybackRate(playbackRate)

        // Set playback position for track to in progress if not already tracked
        const currentUserId = yield* call(queryCurrentUserId)
        const trackPlaybackInfo = yield* select(getTrackPosition, {
          trackId,
          userId: currentUserId
        })
        if (trackPlaybackInfo?.status !== 'IN_PROGRESS') {
          yield* put(
            setTrackPosition({
              userId: currentUserId,
              trackId,
              positionInfo: {
                status: 'IN_PROGRESS',
                playbackPosition: 0
              }
            })
          )
        } else {
          audioPlayer.play()
          yield* put(playSucceeded({ uid, trackId, isPreview: shouldPreview }))
          yield* put(seek({ seconds: trackPlaybackInfo.playbackPosition }))
          return
        }
      } else if (audioPlayer.getPlaybackRate() !== '1x') {
        // Reset playback rate when playing a regular track
        audioPlayer.setPlaybackRate('1x')
      }
    }

    // Play if user has access to track.
    const track = yield* queryTrack(trackId)
    const { shouldSkip, shouldPreview } = calculatePlayerBehavior(
      track,
      playerBehavior
    )
    if (shouldSkip) {
      yield* put(queueActions.next({}))
    } else {
      if (startTime) {
        audioPlayer.seek(startTime)
      }
      audioPlayer.play()
      yield* put(playSucceeded({ uid, trackId, isPreview: shouldPreview }))
    }
  })
}

export function* watchPause() {
  yield* takeLatest(pause.type, function* (action: ReturnType<typeof pause>) {
    const onlySetState = action.payload?.onlySetState

    const audioPlayer = yield* getContext('audioPlayer')
    if (onlySetState) return
    audioPlayer.pause()
  })
}

export function* watchReset() {
  yield* takeLatest(reset.type, function* (action: ReturnType<typeof reset>) {
    const { shouldAutoplay } = action.payload

    const audioPlayer = yield* getContext('audioPlayer')

    audioPlayer.seek(0)
    if (!shouldAutoplay) {
      audioPlayer.pause()
    } else {
      const playerUid = yield* select(getUid)
      const playerTrackId = yield* select(getTrackId)
      const playerBehavior = yield* select(getPlayerBehavior)
      if (playerUid && playerTrackId) {
        yield* put(
          play({
            uid: playerUid,
            trackId: playerTrackId,
            onEnd: queueActions.next,
            playerBehavior: playerBehavior ?? undefined
          })
        )
      }
    }
    yield* put(resetSucceeded({ shouldAutoplay }))
  })
}

export function* watchStop() {
  yield* takeLatest(stop.type, function* (action: ReturnType<typeof stop>) {
    const audioPlayer = yield* getContext('audioPlayer')
    audioPlayer.stop()
  })
}

export function* watchSeek() {
  const audioPlayer = yield* getContext('audioPlayer')

  yield* takeLatest(seek.type, function* (action: ReturnType<typeof seek>) {
    const { seconds } = action.payload
    const trackId = yield* select(getTrackId)

    audioPlayer.seek(seconds)

    if (trackId) {
      const track = yield* queryTrack(trackId)
      const currentUserId = yield* call(queryCurrentUserId)
      const isLongFormContent =
        track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS

      if (isLongFormContent) {
        yield* put(
          setTrackPosition({
            trackId,
            userId: currentUserId,
            positionInfo: {
              status: 'IN_PROGRESS',
              playbackPosition: seconds
            }
          })
        )
      }
    }
  })
}

export function* watchSetPlaybackRate() {
  const audioPlayer = yield* getContext('audioPlayer')
  yield* takeLatest(
    setPlaybackRate.type,
    function* (action: ReturnType<typeof setPlaybackRate>) {
      const { rate } = action.payload
      audioPlayer.setPlaybackRate(rate)
    }
  )
}

// NOTE: Event listeners are attached to the audio object b/c the audio can be manipulated
// directly by the browser & not via the ui or hot keys. If the event listener is triggered
// and the playing field does not match audio, then dispatch an action to update the store.
const AudioEvents = Object.freeze({
  PLAY: 'play',
  PAUSE: 'pause'
})

export function* setAudioListeners() {
  const audioPlayer = yield* getContext('audioPlayer')
  const chan = yield* call(watchAudio, audioPlayer.audio)
  while (true) {
    const audioEvent = yield* take(chan)
    const playing = yield* select(getPlaying)
    if (audioEvent === AudioEvents.PLAY && !playing) {
      yield* put(play({}))
    } else if (audioEvent === AudioEvents.PAUSE && playing) {
      yield* put(pause({}))
    }
  }
}

export function* handleAudioBuffering() {
  const audioPlayer = yield* getContext('audioPlayer')
  const chan = eventChannel((emitter) => {
    audioPlayer.onBufferingChange = (isBuffering: boolean) => {
      emitter(setBuffering({ buffering: isBuffering }))
    }
    return () => {}
  })
  yield* spawn(actionChannelDispatcher, chan)
}

export function* handleAudioErrors() {
  // Watch for audio errors and emit an error saga dispatching action
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
      // Retry from a different mirror if we can
      const track = yield* queryTrack(trackId)
      const playerBehavior = yield* select(getPlayerBehavior)
      const retries = yield* select(getPlaybackRetryCount)
      const { shouldPreview } = calculatePlayerBehavior(track, playerBehavior)
      const streamObj = shouldPreview ? track?.preview : track?.stream
      if (streamObj?.mirrors && streamObj.mirrors.length + 1 > retries) {
        yield* put(play({ trackId, retries: retries + 1 }))
      } else {
        yield* put(
          errorAction({
            error,
            trackId,
            info: data,
            feature: Feature.Playback
          })
        )
      }
    }
  }
}

function watchAudio(audio: HTMLAudioElement) {
  return eventChannel((emitter) => {
    const emitPlay = () => emitter(AudioEvents.PLAY)
    const emitPause = () => {
      if (!audio.ended) {
        emitter(AudioEvents.PAUSE)
      }
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

/**
 * Poll for whether a track has been listened to.
 */
function* recordListenWorker() {
  const isNativeMobile = yield* getContext('isNativeMobile')
  if (isNativeMobile) return
  // Store the last seen play counter to make sure we only record
  // a listen for each "unique" track play. Using an id here wouldn't
  // be enough because the user might have "repeat single" mode turned on.
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

const sagas = () => {
  return [
    watchPlay,
    watchPause,
    watchStop,
    watchReset,
    watchSeek,
    watchSetPlaybackRate,
    setAudioListeners,
    handleAudioErrors,
    handleAudioBuffering,
    recordListenWorker,
    errorSagas
  ]
}

export default sagas
