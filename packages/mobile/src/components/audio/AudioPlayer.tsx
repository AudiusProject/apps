import { useRef, useEffect, useCallback, useState, useMemo } from 'react'

import { useCurrentUserId, useTracks, useUsers } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import { ErrorLevel, Feature, Name, SquareSizes } from '@audius/common/models'
import type { ID, Track } from '@audius/common/models'
import {
  playbackActions,
  playbackSelectors,
  RepeatMode,
  reachabilitySelectors,
  tracksSocialActions,
  playbackRateValueMap,
  playbackPositionActions,
  playbackPositionSelectors,
  gatedContentSelectors,
  calculatePlayerBehavior,
  PlayerBehavior
} from '@audius/common/store'
import type { PlaybackTrack, CommonState } from '@audius/common/store'
import {
  Genre,
  removeNullable,
  getTrackPreviewDuration,
  resolveImageUrl,
  resolveStreamUrl
} from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { isEqual, uniq } from 'lodash'
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  useTrackPlayerEvents,
  RepeatMode as TrackPlayerRepeatMode,
  TrackType,
  useIsPlaying
} from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync, usePrevious } from 'react-use'

import { make, track as analyticsTrack } from 'app/services/analytics'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import {
  getLocalAudioPath,
  getLocalTrackCoverArtPath
} from 'app/services/offline-downloader'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { DOWNLOAD_REASON_FAVORITES } from 'app/store/offline-downloads/constants'
import {
  getOfflineTrackStatus,
  getIsCollectionMarkedForDownload
} from 'app/store/offline-downloads/selectors'
import {
  addOfflineEntries,
  OfflineDownloadStatus
} from 'app/store/offline-downloads/slice'
import { reportToSentry } from 'app/utils/reportToSentry'

import { useChromecast } from './GoogleCast'
import { useSavePodcastProgress } from './useSavePodcastProgress'

export const DEFAULT_IMAGE_URL =
  'https://download.audius.co/static-resources/preview-image.jpg'

const TRACK_ARTWORK_PREFERRED_SIZES = [
  SquareSizes.SIZE_1000_BY_1000,
  SquareSizes.SIZE_480_BY_480,
  SquareSizes.SIZE_150_BY_150
] as const

const getArtworkTargetSize = (artwork?: Track['artwork']) =>
  TRACK_ARTWORK_PREFERRED_SIZES.find((size) => artwork?.[size]) ??
  SquareSizes.SIZE_1000_BY_1000

const { getPlaying, getSeek, getCounter, getPlaybackRate, getTrackId } =
  playbackSelectors
const { setTrackPosition } = playbackPositionActions
const { getUserTrackPositions } = playbackPositionSelectors
const { recordListen } = tracksSocialActions
const { getCurrentPlayerBehavior: getPlayerBehavior } = playbackSelectors
const {
  getPlaybackIndex: getIndex,
  getPlaybackQueue,
  getCurrentSource: getSource,
  getCollectionId,
  getRepeat,
  getShuffle
} = playbackSelectors
const { getIsReachable } = reachabilitySelectors

const { getNftAccessSignatureMap } = gatedContentSelectors

// TODO: These constants are the same in now playing drawer. Move them to shared location
const SKIP_DURATION_SEC = 15
const RESTART_THRESHOLD_SEC = 3
const RECORD_LISTEN_SECONDS = 1

const TRACK_END_BUFFER = 2

const defaultCapabilities = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious
]
const longFormContentCapabilities = [
  ...defaultCapabilities,
  Capability.JumpForward,
  Capability.JumpBackward
]

// Set options for controlling music on the lock screen when the app is in the background
const updatePlayerOptions = async (isLongFormContent = false) => {
  const coreCapabilities = isLongFormContent
    ? longFormContentCapabilities
    : defaultCapabilities
  return await TrackPlayer.updateOptions({
    // Media controls capabilities
    capabilities: [...coreCapabilities, Capability.Stop, Capability.SeekTo],
    // Notification form capabilities
    notificationCapabilities: coreCapabilities,
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
    }
  })
}

const playerEvents = [
  Event.PlaybackError,
  Event.PlaybackProgressUpdated,
  Event.PlaybackQueueEnded,
  Event.PlaybackActiveTrackChanged,
  Event.RemotePlay,
  Event.RemotePause,
  Event.RemoteNext,
  Event.RemotePrevious,
  Event.RemoteJumpForward,
  Event.RemoteJumpBackward,
  Event.RemoteSeek
]

const unlistedTrackFallbackTrackData = {
  url: 'url',
  type: TrackType.Default,
  title: '',
  artist: '',
  genre: '',
  artwork: '',
  imageUrl: '',
  duration: 0
}

type QueueableTrack = {
  track: Nullable<Track>
} & Pick<PlaybackTrack, 'playerBehavior'>

export const AudioPlayer = () => {
  const track = useCurrentTrack()
  const playing = useSelector(getPlaying)
  const seek = useSelector(getSeek)
  const counter = useSelector(getCounter)
  const repeatMode = useSelector(getRepeat)
  const playbackRate = useSelector(getPlaybackRate)
  const { data: currentUserId } = useCurrentUserId()
  const playingTrackId = useSelector(getTrackId)
  const playerBehavior = useSelector(getPlayerBehavior)
  const previousPlayingTrackId = usePrevious(playingTrackId)
  const previousPlayerBehavior =
    usePrevious(playerBehavior) || PlayerBehavior.FULL_OR_PREVIEW
  const trackPositions = useSelector((state: CommonState) =>
    getUserTrackPositions(state, { userId: currentUserId })
  )
  const [retries, setRetries] = useState(0)

  const isReachable = useSelector(getIsReachable)
  const isNotReachable = isReachable === false
  const nftAccessSignatureMap = useSelector(getNftAccessSignatureMap)

  useChromecast()

  // Queue Things
  const queueIndex = useSelector(getIndex)
  const queueShuffle = useSelector(getShuffle)
  const queueOrder = useSelector(getPlaybackQueue)
  const queueSource = useSelector(getSource)
  const queueCollectionId = useSelector(getCollectionId)
  const queueTrackIds = useMemo(
    () => queueOrder.map((trackData) => trackData.trackId as ID),
    [queueOrder]
  )

  const { byId: tracksById } = useTracks(uniq(queueTrackIds))
  const queueTracks = useMemo(
    () =>
      queueOrder.map(({ trackId, playerBehavior }) => ({
        track: tracksById[trackId],
        playerBehavior
      })),
    [queueOrder, tracksById]
  )
  const queueTrackOwnerIds = useMemo(
    () =>
      queueTracks.map(({ track }) => track?.owner_id).filter(removeNullable),
    [queueTracks]
  )

  const { byId: queueTrackOwnersMap } = useUsers(queueTrackOwnerIds)

  const isCollectionMarkedForDownload = useSelector(
    getIsCollectionMarkedForDownload(
      queueSource === 'SAVED_TRACKS'
        ? DOWNLOAD_REASON_FAVORITES
        : queueCollectionId?.toString()
    )
  )
  const wasCollectionMarkedForDownload = usePrevious(
    isCollectionMarkedForDownload
  )
  const didOfflineToggleChange =
    isCollectionMarkedForDownload !== wasCollectionMarkedForDownload

  const didPlayerBehaviorChange = previousPlayerBehavior !== playerBehavior

  // A map from trackId to offline availability
  const offlineAvailabilityByTrackId = useSelector((state) => {
    const offlineTrackStatus = getOfflineTrackStatus(state)
    return queueTrackIds.reduce((result, id) => {
      if (offlineTrackStatus[id] === OfflineDownloadStatus.SUCCESS) {
        return {
          ...result,
          [id]: true
        }
      }
      return result
    }, {})
  }, isEqual)

  const dispatch = useDispatch()

  const isLongFormContentRef = useRef<boolean>(false)
  const [isAudioSetup, setIsAudioSetup] = useState(false)

  const play = useCallback(() => dispatch(playbackActions.play()), [dispatch])
  const pause = useCallback(() => dispatch(playbackActions.pause()), [dispatch])
  const next = useCallback(() => dispatch(playbackActions.next()), [dispatch])
  const previous = useCallback(
    () => dispatch(playbackActions.previous()),
    [dispatch]
  )

  const reset = useCallback(
    () => dispatch(playbackActions.reset({ shouldAutoplay: false })),
    [dispatch]
  )
  const updateQueueIndex = useCallback(
    (index: number) => dispatch(playbackActions.setIndex({ index })),
    [dispatch]
  )
  const updatePlayerInfo = useCallback(
    ({
      previewing,
      trackId,
      index
    }: {
      previewing: boolean
      trackId: number
      index: number
    }) => {
      dispatch(playbackActions.set({ previewing, trackId, index }))
    },
    [dispatch]
  )

  const [bufferStartTime, setBufferStartTime] = useState<number>()

  const { bufferingDuringPlay } = useIsPlaying() // react-native-track-player hook

  const previousBufferingState = usePrevious(bufferingDuringPlay)

  useEffect(() => {
    // Keep redux buffering status in sync with react-native-track-player's buffering status
    // Only need to dispatch when the value actually changes so we check against the previous value
    if (
      bufferingDuringPlay !== undefined &&
      bufferingDuringPlay !== previousBufferingState
    ) {
      dispatch(playbackActions.setBuffering({ buffering: bufferingDuringPlay }))
      if (!bufferingDuringPlay && bufferStartTime) {
        const bufferDuration = Math.ceil(performance.now() - bufferStartTime)
        analyticsTrack(
          make({ eventName: Name.BUFFERING_TIME, duration: bufferDuration })
        )
        setBufferStartTime(undefined)
      }
    }
  }, [
    bufferStartTime,
    bufferingDuringPlay,
    dispatch,
    previousBufferingState,
    track
  ])

  const makeTrackData = useCallback(
    async ({ track, playerBehavior }: QueueableTrack, retries?: number) => {
      try {
        if (!track) {
          return unlistedTrackFallbackTrackData
        }
        setRetries(retries ?? 0)

        const trackOwner = queueTrackOwnersMap[track.owner_id]
        const trackId = track.track_id
        const offlineTrackAvailable =
          trackId && offlineAvailabilityByTrackId[trackId]

        const { shouldPreview } = calculatePlayerBehavior(track, playerBehavior)

        // Get Track url
        let url: string

        const streamObj = shouldPreview ? track.preview : track.stream
        if (offlineTrackAvailable && isCollectionMarkedForDownload) {
          const audioFilePath = getLocalAudioPath(trackId)
          url = `file://${audioFilePath}`
        } else if (streamObj?.url) {
          url =
            (await resolveStreamUrl(streamObj, retries ?? 0)) ?? streamObj.url
        } else {
          const sdk = await audiusSdk()
          const nftAccessSignature = nftAccessSignatureMap[trackId]?.mp3 ?? null
          const { data, signature } =
            await audiusBackendInstance.signGatedContentRequest({
              sdk
            })
          url = await sdk.tracks.getTrackStreamUrl({
            trackId: Id.parse(track.track_id),
            userId: OptionalId.parse(currentUserId),
            userSignature: signature,
            userData: data,
            nftAccessSignature: nftAccessSignature
              ? JSON.stringify(nftAccessSignature)
              : undefined
          })
        }

        const localTrackImageSource =
          isNotReachable && track
            ? `file://${getLocalTrackCoverArtPath(trackId.toString())}`
            : undefined

        const imageUrl =
          localTrackImageSource ??
          (await resolveImageUrl({
            artwork: track.artwork,
            targetSize: getArtworkTargetSize(track.artwork),
            defaultImage: DEFAULT_IMAGE_URL
          })) ??
          DEFAULT_IMAGE_URL

        return {
          url,
          type: TrackType.Default,
          title: track.title,
          artist: trackOwner.name,
          genre: track.genre,
          date: track.created_at,
          artwork: imageUrl,
          duration: shouldPreview
            ? getTrackPreviewDuration(track)
            : track.duration
        }
      } catch (e) {
        reportToSentry({
          level: ErrorLevel.Error,
          name: 'AudioPlayer: makeTrackData failed',
          additionalInfo: {
            track,
            playerBehavior,
            trackOwner: queueTrackOwnersMap[track?.owner_id ?? '']
          },
          feature: Feature.Playback,
          error: e
        })
        return unlistedTrackFallbackTrackData
      }
    },
    [
      currentUserId,
      isCollectionMarkedForDownload,
      isNotReachable,
      nftAccessSignatureMap,
      offlineAvailabilityByTrackId,
      queueTrackOwnersMap,
      setRetries
    ]
  )

  // Perform initial setup for the track player
  useAsync(async () => {
    try {
      await updatePlayerOptions()
    } catch (e) {
      // The player has already been set up
    }
    setIsAudioSetup(true)
  }, [])

  // When component unmounts (App is closed), reset
  useEffect(() => {
    return () => {
      reset()
      TrackPlayer.stop()
    }
  }, [reset])

  useTrackPlayerEvents(playerEvents, async (event) => {
    const duration = (await TrackPlayer.getProgress()).duration
    const position = (await TrackPlayer.getProgress()).position

    if (event.type === Event.PlaybackError) {
      console.error(`TrackPlayer Playback Error:`, event)
      const updatedTrack = await makeTrackData(
        {
          track,
          playerBehavior
        },
        retries + 1
      )
      TrackPlayer.load(updatedTrack)
    }

    if (event.type === Event.RemotePlay || event.type === Event.RemotePause) {
      playing ? pause() : play()
    }
    if (event.type === Event.RemoteNext) next()
    if (event.type === Event.RemotePrevious) {
      if (position > RESTART_THRESHOLD_SEC) {
        setSeekPosition(0)
      } else {
        previous()
      }
    }

    if (event.type === Event.RemoteSeek) {
      setSeekPosition(event.position)
    }
    if (event.type === Event.RemoteJumpForward) {
      setSeekPosition(Math.min(duration, position + SKIP_DURATION_SEC))
    }
    if (event.type === Event.RemoteJumpBackward) {
      setSeekPosition(Math.max(0, position - SKIP_DURATION_SEC))
    }

    if (event.type === Event.PlaybackQueueEnded) {
      // TODO: Queue ended, what should done here?
    }

    if (event.type === Event.PlaybackActiveTrackChanged) {
      setBufferStartTime(performance.now())
      await queueSetupJobRef.current
      const playerIndex = await TrackPlayer.getActiveTrackIndex()
      if (playerIndex === undefined) return

      // Update queue and player state if the track player auto plays next track
      if (playerIndex > queueIndex) {
        if (queueShuffle) {
          // TODO: There will be a very short period where the next track in the queue is played instead of the next shuffle track.
          // Figure out how to call next earlier
          next()
        } else {
          const { track, playerBehavior } = queueTracks[playerIndex] ?? {}

          const { shouldSkip, shouldPreview } = calculatePlayerBehavior(
            track,
            playerBehavior
          )

          // Skip track if user does not have access i.e. for an unlocked gated track
          if (!track || shouldSkip) {
            next()
          } else {
            // Track Player natively went to the next track
            // Update queue info and handle playback position updates
            updateQueueIndex(playerIndex)
            updatePlayerInfo({
              previewing: shouldPreview,
              trackId: track.track_id,
              index: playerIndex
            })

            const isLongFormContent =
              track?.genre === Genre.Podcasts ||
              track?.genre === Genre.Audiobooks
            const trackPosition = trackPositions?.[track.track_id]
            if (trackPosition?.status === 'IN_PROGRESS') {
              dispatch(
                playbackActions.seekTo({
                  seconds: trackPosition.playbackPosition
                })
              )
            } else if (isLongFormContent) {
              dispatch(
                setTrackPosition({
                  userId: currentUserId,
                  trackId: track.track_id,
                  positionInfo: {
                    status: 'IN_PROGRESS',
                    playbackPosition: 0
                  }
                })
              )
            }
          }
        }
      }

      const isLongFormContent =
        queueTracks[playerIndex]?.track?.genre === Genre.Podcasts ||
        queueTracks[playerIndex]?.track?.genre === Genre.Audiobooks

      // Always set the correct playback rate when the active track changes
      const newRate = isLongFormContent
        ? playbackRateValueMap[playbackRate]
        : 1.0
      await TrackPlayer.setRate(newRate)

      // Update lock screen and notification controls only when long-form content status changes
      if (isLongFormContent !== isLongFormContentRef.current) {
        isLongFormContentRef.current = isLongFormContent
        await updatePlayerOptions(isLongFormContent)
      }

      // Handle track end event
      if (event?.lastPosition !== undefined && event?.index !== undefined) {
        const { track } = queueTracks[event.index] ?? {}
        const isLongFormContent =
          track?.genre === Genre.Podcasts || track?.genre === Genre.Audiobooks
        const isAtEndOfTrack =
          track?.duration &&
          event.lastPosition >= track.duration - TRACK_END_BUFFER

        if (isLongFormContent && isAtEndOfTrack) {
          dispatch(
            setTrackPosition({
              userId: currentUserId,
              trackId: track.track_id,
              positionInfo: {
                status: 'COMPLETED',
                playbackPosition: 0
              }
            })
          )
        }
      }
    }
  })

  // Record play effect
  useEffect(() => {
    const trackId = track?.track_id
    if (!trackId) return

    const playCounterTimeout = setTimeout(() => {
      if (isReachable) {
        dispatch(recordListen(trackId))
      } else {
        dispatch(
          addOfflineEntries({ items: [{ type: 'play-count', id: trackId }] })
        )
      }
    }, RECORD_LISTEN_SECONDS)

    return () => clearTimeout(playCounterTimeout)
  }, [counter, dispatch, isReachable, track?.track_id])

  const seekToRef = useRef<number | null>(null)

  const setSeekPosition = useCallback(async (seekPos = 0) => {
    const { state } = await TrackPlayer.getPlaybackState()
    const isSeekableState = state === State.Playing || state === State.Ready

    // Delay calling seekTo if we are not currently in a seekable state
    // Delayed seeking is handle in handlePlayerStateChange
    if (isSeekableState) {
      TrackPlayer.seekTo(seekPos)
    } else {
      seekToRef.current = seekPos
    }
  }, [])

  const handlePlayerStateChange = useCallback(async ({ state }) => {
    const inSeekableState = state === State.Playing || state === State.Ready
    const seekRefValue = seekToRef.current

    if (inSeekableState && seekRefValue !== null) {
      TrackPlayer.seekTo(seekRefValue)
      seekToRef.current = null
    }
  }, [])

  // Single subscription with cleanup on unmount only. handlePlayerStateChange
  // is stable (useCallback with [] deps) and only uses refs/TrackPlayer, so
  // we avoid re-running this effect to prevent removing the listener during
  // track switches (which can break playback when playing a second track).
  useEffect(() => {
    const subscription = TrackPlayer.addEventListener(
      Event.PlaybackState,
      handlePlayerStateChange
    )

    return () => {
      subscription.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: register once, cleanup on unmount only
  }, [])

  // Seek handler
  useEffect(() => {
    if (seek !== null) {
      setSeekPosition(seek)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek])

  // Keep track of the track index the last time counter was updated
  const counterTrackIndex = useRef<number | null>(null)

  const resetPositionForSameTrack = useCallback(() => {
    // NOTE: Make sure that we only set seek position to 0 when we are restarting a track
    if (queueIndex === counterTrackIndex.current) setSeekPosition(0)
    counterTrackIndex.current = queueIndex
  }, [queueIndex, setSeekPosition])

  const counterRef = useRef<number | null>(null)

  // Restart (counter) handler
  useEffect(() => {
    if (counter !== counterRef.current) {
      counterRef.current = counter
      resetPositionForSameTrack()
    }
  }, [counter, resetPositionForSameTrack])

  // Ref to keep track of the queue in the track player vs the queue in state.
  // Identity is the trackId-array — duplicates are fine because we still
  // diff position-by-position with isEqual.
  const queueListRef = useRef<ID[]>([])

  // A way to abort the in-flight queue build if a new lineup supersedes it.
  const abortEnqueueControllerRef = useRef(new AbortController())
  // Tracks the in-flight handleQueueChange invocation. Set synchronously
  // by the useEffect below so handleQueueIdxChange can await it before
  // reading the active index, and so a new build can serialize after the
  // prior one's pending TrackPlayer ops have settled.
  const queueSetupJobRef = useRef<Promise<void> | undefined>(undefined)

  const handleQueueChange = useCallback(
    async (priorJob: Promise<void> | undefined) => {
      const refTrackIds = queueListRef.current

      // Due to a dependency waterfall (queue from redux -> useTracks -> useUsers),
      // we need queue + tracks + users all loaded before mutating RNTP.
      // Original bug: https://linear.app/audius/issue/QA-2255/keeps-playing-the-same-track-when-clicking-new-tracks-in-the-same
      if (
        !queueTracks.every(
          ({ track }) =>
            !!track?.track_id && !!queueTrackOwnersMap[track.owner_id]
        )
      ) {
        return
      }
      if (queueIndex === -1) return
      if (
        isEqual(refTrackIds, queueTrackIds) &&
        !didOfflineToggleChange &&
        !didPlayerBehaviorChange
      ) {
        return
      }

      queueListRef.current = queueTrackIds

      // Append-detection: the new queue is the previous queue plus more
      // tracks tacked on. Keep RNTP playback going and just append.
      const isQueueAppend =
        refTrackIds.length > 0 &&
        isEqual(queueTrackIds.slice(0, refTrackIds.length), refTrackIds) &&
        !didPlayerBehaviorChange

      // Replace cancels the in-flight build immediately; append serializes
      // after it instead of cancelling.
      if (!isQueueAppend) {
        abortEnqueueControllerRef.current.abort()
      }
      if (priorJob) await priorJob

      abortEnqueueControllerRef.current = new AbortController()
      const { signal } = abortEnqueueControllerRef.current

      if (isQueueAppend) {
        const newTracks = queueTracks.slice(refTrackIds.length)
        const trackData = await Promise.all(
          newTracks.map((qt) => makeTrackData(qt))
        )
        if (signal.aborted) return
        await TrackPlayer.add(trackData)
        return
      }

      // Resolve all stream URLs in parallel, then mutate RNTP atomically:
      // reset, add the entire queue in order, skip to the active index,
      // play. One transactional build means the active index can't drift
      // mid-build, and parallel URL resolution is roughly as fast as the
      // old "fetch firstTrack first, then sequentially fetch the rest"
      // path while removing all the surrounding race-condition surface.
      const trackData = await Promise.all(
        queueTracks.map((qt) => makeTrackData(qt))
      )
      if (signal.aborted) return
      await TrackPlayer.reset()
      if (signal.aborted) return
      await TrackPlayer.add(trackData)
      if (signal.aborted) return
      if (queueIndex > 0) {
        await TrackPlayer.skip(queueIndex)
        if (signal.aborted) return
      }
      await TrackPlayer.play()
    },
    [
      queueTracks,
      queueIndex,
      queueTrackIds,
      didOfflineToggleChange,
      didPlayerBehaviorChange,
      queueTrackOwnersMap,
      makeTrackData
    ]
  )

  // Tracks the most-recently-requested queueIndex so older in-flight
  // handleQueueIdxChange invocations (from rapid "next" taps) can bail out
  // instead of racing and skipping out of order.
  const latestQueueIdxRef = useRef<number>(-1)

  const handleQueueIdxChange = useCallback(async () => {
    if (queueIndex === -1) return
    latestQueueIdxRef.current = queueIndex

    // Wait for any in-flight queue build so we read the active index
    // against the final queue layout. handleQueueChange already calls
    // skip(queueIndex) at the end of a fresh build, so this branch is
    // primarily for index-only changes (e.g. "next" in the now-playing
    // drawer) where the queue itself didn't change.
    await queueSetupJobRef.current

    if (latestQueueIdxRef.current !== queueIndex) return

    const queue = await TrackPlayer.getQueue()
    if (queueIndex >= queue.length) return

    const playerIdx = await TrackPlayer.getActiveTrackIndex()
    if (queueIndex !== playerIdx) {
      await TrackPlayer.skip(queueIndex)
    }
  }, [queueIndex])

  // Tracks the latest handleQueueIdxChange invocation so handleTogglePlay can
  // wait for a pending skip before calling TrackPlayer.play(). Without this,
  // when resuming into a different track than was paused, TrackPlayer.play()
  // briefly resumes the previously-loaded (paused) track for a moment before
  // the skip to the new index lands.
  const queueIdxChangeJobRef = useRef<Promise<void> | undefined>(undefined)

  const handleTogglePlay = useCallback(async () => {
    if (playing) {
      // Ensure any pending skip completes before we unpause, otherwise the
      // previously-paused track resumes for a frame on the native player.
      await queueIdxChangeJobRef.current
      await TrackPlayer.play()
    } else {
      await TrackPlayer.pause()
    }
  }, [playing])

  const handleStop = useCallback(async () => {
    TrackPlayer.reset()
  }, [])

  const handleRepeatModeChange = useCallback(async () => {
    if (repeatMode === RepeatMode.SINGLE) {
      await TrackPlayer.setRepeatMode(TrackPlayerRepeatMode.Track)
    } else if (repeatMode === RepeatMode.ALL) {
      await TrackPlayer.setRepeatMode(TrackPlayerRepeatMode.Queue)
    } else {
      await TrackPlayer.setRepeatMode(TrackPlayerRepeatMode.Off)
    }
  }, [repeatMode])

  const handlePlaybackRateChange = useCallback(async () => {
    if (!isLongFormContentRef.current) return
    await TrackPlayer.setRate(playbackRateValueMap[playbackRate])
  }, [playbackRate])

  useEffect(() => {
    if (isAudioSetup) {
      handleRepeatModeChange()
    }
  }, [handleRepeatModeChange, repeatMode, isAudioSetup])

  useEffect(() => {
    if (isAudioSetup) {
      const priorJob = queueSetupJobRef.current
      queueSetupJobRef.current = handleQueueChange(priorJob)
    }
  }, [handleQueueChange, queueTrackIds, isAudioSetup])

  useAsync(async () => {
    if (isAudioSetup && didPlayerBehaviorChange) {
      const updatedTrack = await makeTrackData(queueTracks[queueIndex])
      await TrackPlayer.load(updatedTrack)
      updatePlayerInfo({
        previewing: calculatePlayerBehavior(
          queueTracks[queueIndex].track,
          queueTracks[queueIndex].playerBehavior
        ).shouldPreview,
        trackId: queueTracks[queueIndex].track?.track_id ?? 0,
        index: queueIndex
      })
    }
  }, [didPlayerBehaviorChange])

  useEffect(() => {
    if (isAudioSetup) {
      // Store the promise so handleTogglePlay can await the skip before
      // calling TrackPlayer.play() on a resume-into-different-track.
      queueIdxChangeJobRef.current = handleQueueIdxChange()
    }
  }, [handleQueueIdxChange, queueIndex, isAudioSetup])

  useEffect(() => {
    if (isAudioSetup) {
      handleTogglePlay()
    }
  }, [handleTogglePlay, playing, isAudioSetup])

  useEffect(() => {
    handlePlaybackRateChange()
  }, [handlePlaybackRateChange, playbackRate])

  useEffect(() => {
    // Stop playback if we have unloaded a track from the player.
    if (previousPlayingTrackId && !playingTrackId && !playing) {
      handleStop()
    }
  }, [handleStop, playing, playingTrackId, previousPlayingTrackId])

  useSavePodcastProgress()

  return null
}
