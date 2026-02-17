import { Id, OptionalId } from '@audius/sdk'
import { Action } from '@reduxjs/toolkit'
import { EventChannel, eventChannel } from 'redux-saga'
import { take, call, put, spawn, takeLatest, select } from 'typed-redux-saga'

import { queryCurrentUserId, queryTrack } from '~/api'
import {
  getContext,
  reachabilitySelectors,
  playbackPositionActions,
  playbackPositionSelectors,
  RepeatMode
} from '~/store'
import { getSDK } from '~/store/sdkUtils'
import { Genre, getTrackPreviewDuration } from '~/utils'
import { waitForRead } from '~/utils/sagaHelpers'

import {
  getLineupId,
  getCurrentIndex,
  getCurrentTrackId,
  getShuffle,
  getShuffleOrder,
  getRepeat
} from './selectors'
import {
  play,
  playSucceeded,
  pause,
  setBuffering,
  seek,
  setPlaybackRate,
  next,
  previous,
  stop
} from './slice'
import { getLineupData } from './utils/getLineupData'

const { setTrackPosition } = playbackPositionActions
const { getTrackPosition } = playbackPositionSelectors
const { getIsReachable } = reachabilitySelectors

// Helper to get track stream URL (simplified version)
const getTrackStreamUrl = (
  track: any,
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
    const { lineupId, trackId } = action.payload ?? {}

    if (!lineupId || !trackId) {
      return
    }

    const audioPlayer = yield* getContext('audioPlayer')
    const queryClient = yield* getContext('queryClient')
    const isNativeMobile = yield* getContext('isNativeMobile')
    const audiusBackendInstance = yield* getContext('audiusBackendInstance')

    // Get lineup data from tan-query cache
    const currentUserIdResult: number | null | undefined =
      yield* call(queryCurrentUserId)
    const currentUserId: number | null = currentUserIdResult ?? null
    const lineup = getLineupData(lineupId, queryClient, currentUserId)

    if (!lineup || lineup.length === 0) return

    // Find track index in lineup
    const trackIndex = lineup.findIndex((id) => id === trackId)
    if (trackIndex === -1) return

    // Load track metadata
    const track = yield* queryTrack(trackId)
    if (!track) return

    const isReachable = yield* select(getIsReachable)
    if (!isReachable && isNativeMobile) {
      // Play offline
      audioPlayer.play()
      yield* put(playSucceeded({ lineupId, trackId, currentIndex: trackIndex }))
      return
    }

    yield* call(waitForRead)
    const sdk = yield* getSDK()

    const nftAccessSignatureMap = yield* select(
      (state: any) => state.gatedContent.nftAccessSignatureMap
    )
    const nftAccessSignature =
      nftAccessSignatureMap[track.track_id]?.mp3 ?? null

    let trackDuration = track.duration
    const shouldPreview = false // Simplified for now
    if (shouldPreview) {
      trackDuration = getTrackPreviewDuration(track)
    }

    const contentNodeStreamUrl = getTrackStreamUrl(track, shouldPreview, 0)
    const isLongFormContent =
      track.genre === Genre.PODCASTS || track.genre === Genre.AUDIOBOOKS

    const createEndChannel = (url: string): EventChannel<any> => {
      const endChannel = eventChannel((emitter) => {
        audioPlayer.load(
          trackDuration ||
            track.track_segments.reduce(
              (duration: number, segment: { duration: string }) =>
                duration + parseFloat(segment.duration),
              0
            ),
          () => {
            // On track end, play next
            emitter(next({}))
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
    if (contentNodeStreamUrl) {
      endChannel = yield* call(createEndChannel, contentNodeStreamUrl)
    } else {
      const result: { data: string; signature: string } = yield* call(
        audiusBackendInstance.signGatedContentRequest,
        { sdk }
      )
      const { data, signature } = result
      const streamUrl: string = yield* call(
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

    yield* spawn(function* () {
      while (true) {
        const action: Action<any> | null = yield* take(endChannel)
        if (action !== null && action !== undefined) {
          yield* put(action)
        }
      }
    })

    if (isLongFormContent) {
      const playbackRate = yield* select(
        (state: any) => state.playback.playbackRate
      )
      audioPlayer.setPlaybackRate(playbackRate)

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
        yield* put(
          playSucceeded({ lineupId, trackId, currentIndex: trackIndex })
        )
        yield* put(seek({ seconds: trackPlaybackInfo.playbackPosition }))
        return
      }
    }

    audioPlayer.play()
    yield* put(playSucceeded({ lineupId, trackId, currentIndex: trackIndex }))
  })
}

export function* watchPause() {
  yield* takeLatest(pause.type, function* () {
    const audioPlayer = yield* getContext('audioPlayer')
    audioPlayer.pause()
  })
}

export function* watchSeek() {
  const audioPlayer = yield* getContext('audioPlayer')
  yield* takeLatest(seek.type, function* (action: ReturnType<typeof seek>) {
    const { seconds } = action.payload
    const trackId = yield* select(getCurrentTrackId)

    audioPlayer.seek(seconds)

    if (trackId) {
      const track = yield* queryTrack(trackId)
      const currentUserIdResult: number | null | undefined =
        yield* call(queryCurrentUserId)
      const currentUserId: number | null = currentUserIdResult ?? null
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

export function* watchNext() {
  yield* takeLatest(next.type, function* () {
    const lineupId = yield* select(getLineupId)
    const currentIndex = yield* select(getCurrentIndex)
    const shuffle = yield* select(getShuffle)
    const shuffleOrder = yield* select(getShuffleOrder)
    const repeat = yield* select(getRepeat)

    if (!lineupId || currentIndex === -1) return

    const queryClient = yield* getContext('queryClient')
    const currentUserId: number | null = yield* call(queryCurrentUserId)
    const lineup = getLineupData(lineupId, queryClient, currentUserId)

    if (!lineup || lineup.length === 0) return

    let nextIndex: number

    if (shuffle && shuffleOrder) {
      // Handle shuffle
      const currentShuffleIndex = shuffleOrder.indexOf(currentIndex)
      if (
        currentShuffleIndex === -1 ||
        currentShuffleIndex === shuffleOrder.length - 1
      ) {
        if (repeat === RepeatMode.ALL) {
          nextIndex = shuffleOrder[0]
        } else {
          yield* put(stop())
          return
        }
      } else {
        nextIndex = shuffleOrder[currentShuffleIndex + 1]
      }
    } else {
      // Normal next
      if (currentIndex + 1 >= lineup.length) {
        if (repeat === RepeatMode.ALL) {
          nextIndex = 0
        } else {
          yield* put(stop())
          return
        }
      } else {
        nextIndex = currentIndex + 1
      }
    }

    const nextTrackId = lineup[nextIndex]
    if (nextTrackId) {
      yield* put(play({ lineupId, trackId: nextTrackId }))
    }
  })
}

export function* watchPrevious() {
  yield* takeLatest(previous.type, function* () {
    const lineupId = yield* select(getLineupId)
    const currentIndex = yield* select(getCurrentIndex)
    const shuffle = yield* select(getShuffle)
    const shuffleOrder = yield* select(getShuffleOrder)
    const repeat = yield* select(getRepeat)

    if (!lineupId || currentIndex === -1) return

    const queryClient = yield* getContext('queryClient')
    const currentUserId: number | null = yield* call(queryCurrentUserId)
    const lineup = getLineupData(lineupId, queryClient, currentUserId)

    if (!lineup || lineup.length === 0) return

    let prevIndex: number

    if (shuffle && shuffleOrder) {
      // Handle shuffle
      const currentShuffleIndex = shuffleOrder.indexOf(currentIndex)
      if (currentShuffleIndex === -1 || currentShuffleIndex === 0) {
        if (repeat === RepeatMode.ALL) {
          prevIndex = shuffleOrder[shuffleOrder.length - 1]
        } else {
          return // Can't go back
        }
      } else {
        prevIndex = shuffleOrder[currentShuffleIndex - 1]
      }
    } else {
      // Normal previous
      if (currentIndex === 0) {
        if (repeat === RepeatMode.ALL) {
          prevIndex = lineup.length - 1
        } else {
          return // Can't go back
        }
      } else {
        prevIndex = currentIndex - 1
      }
    }

    const prevTrackId = lineup[prevIndex]
    if (prevTrackId) {
      yield* put(play({ lineupId, trackId: prevTrackId }))
    }
  })
}

export function* handleAudioBuffering() {
  const audioPlayer = yield* getContext('audioPlayer')
  const chan = eventChannel((emitter) => {
    audioPlayer.onBufferingChange = (isBuffering: boolean) => {
      emitter(setBuffering({ buffering: isBuffering }))
    }
    return () => {}
  })
  yield* spawn(function* () {
    while (true) {
      const action: Action<any> | null = yield* take(chan)
      if (action !== null && action !== undefined) {
        yield* put(action)
      }
    }
  })
}

export const sagas = () => {
  return [
    watchPlay,
    watchPause,
    watchSeek,
    watchSetPlaybackRate,
    watchNext,
    watchPrevious,
    handleAudioBuffering
  ]
}
