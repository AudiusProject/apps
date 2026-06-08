import { useRef, useEffect, useCallback, useState, useMemo } from 'react'

import { useCurrentUserId, useTracks, useUsers } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import { Name, SquareSizes } from '@audius/common/models'
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
  removeNullable,
  getTrackPreviewDuration,
  isLongFormContent,
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
  getRepeat
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

const updatePlayerOptions = async (isLongForm = false) => {
  const coreCapabilities = isLongForm
    ? longFormContentCapabilities
    : defaultCapabilities
  return await TrackPlayer.updateOptions({
    capabilities: [...coreCapabilities, Capability.Stop, Capability.SeekTo],
    notificationCapabilities: coreCapabilities,
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
    }
  })
}

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

// ---------------------------------------------------------------------------
// Hook: useAudioPlayerSetup
// ---------------------------------------------------------------------------
/** One-time TrackPlayer initialisation and teardown. */
const useAudioPlayerSetup = () => {
  const [isAudioSetup, setIsAudioSetup] = useState(false)
  const dispatch = useDispatch()

  useAsync(async () => {
    try {
      await updatePlayerOptions()
    } catch (e) {
      // The player has already been set up
    }
    setIsAudioSetup(true)
  }, [])

  useEffect(() => {
    return () => {
      dispatch(playbackActions.reset({ shouldAutoplay: false }))
      TrackPlayer.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return isAudioSetup
}

// ---------------------------------------------------------------------------
// Hook: useQueueSync
// ---------------------------------------------------------------------------
/** Keeps RNTP's native queue in sync with the redux queue. */
const useQueueSync = (isAudioSetup: boolean) => {
  const dispatch = useDispatch()

  const queueIndex = useSelector(getIndex)
  const queueOrder = useSelector(getPlaybackQueue)
  const queueSource = useSelector(getSource)
  const queueCollectionId = useSelector(getCollectionId)
  const playerBehavior = useSelector(getPlayerBehavior)
  const previousPlayerBehavior =
    usePrevious(playerBehavior) || PlayerBehavior.FULL_OR_PREVIEW
  const didPlayerBehaviorChange = previousPlayerBehavior !== playerBehavior

  const { data: currentUserId } = useCurrentUserId()
  const isReachable = useSelector(getIsReachable)
  const isNotReachable = isReachable === false
  const nftAccessSignatureMap = useSelector(getNftAccessSignatureMap)

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

  const offlineAvailabilityByTrackId = useSelector((state) => {
    const offlineTrackStatus = getOfflineTrackStatus(state)
    return queueTrackIds.reduce((result, id) => {
      if (offlineTrackStatus[id] === OfflineDownloadStatus.SUCCESS) {
        return { ...result, [id]: true }
      }
      return result
    }, {})
  }, isEqual)

  const [retries, setRetries] = useState(0)

  const makeTrackData = useCallback(
    async ({ track, playerBehavior }: QueueableTrack, retries?: number) => {
      try {
        if (!track) return unlistedTrackFallbackTrackData
        setRetries(retries ?? 0)

        const trackOwner = queueTrackOwnersMap[track.owner_id]
        const trackId = track.track_id
        const offlineTrackAvailable =
          trackId && offlineAvailabilityByTrackId[trackId]
        const { shouldPreview } = calculatePlayerBehavior(track, playerBehavior)

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
            await audiusBackendInstance.signGatedContentRequest({ sdk })
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
        console.error('AudioPlayer: makeTrackData failed', e)
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

  // Ref tracking which trackIds RNTP currently has loaded.
  const queueListRef = useRef<ID[]>([])

  // --- resetQueue: full queue replacement (batch) ---
  const resetQueue = useCallback(
    async (tracks: QueueableTrack[], startIndex: number) => {
      await TrackPlayer.reset()

      const firstTrack = tracks[startIndex]
      if (!firstTrack) return

      // Load and play the target track immediately
      await TrackPlayer.add(await makeTrackData(firstTrack))
      await TrackPlayer.play()

      // Batch-resolve remaining tracks concurrently, then add in order
      if (tracks.length > 1) {
        const remaining = tracks
          .map((t, i) => ({ t, i }))
          .filter(({ i }) => i !== startIndex)

        const resolved = await Promise.all(
          remaining.map(async ({ t, i }) => ({
            data: await makeTrackData(t),
            i
          }))
        )

        // Sort by original index so RNTP order matches redux order
        resolved.sort((a, b) => a.i - b.i)

        const before = resolved.filter(({ i }) => i < startIndex)
        const after = resolved.filter(({ i }) => i > startIndex)

        // Insert "before" tracks at position 0. Iterate from last to first so
        // that earliest ends up at index 0 (each insert pushes prior entries
        // right by one).
        for (let j = before.length - 1; j >= 0; j--) {
          await TrackPlayer.add(before[j].data, 0)
        }

        // Append "after" tracks at the end
        if (after.length > 0) {
          await TrackPlayer.add(after.map(({ data }) => data))
        }
      }
    },
    [makeTrackData]
  )

  // --- appendToQueue: add new tracks to end ---
  const appendToQueue = useCallback(
    async (newTracks: QueueableTrack[]) => {
      const resolved = await Promise.all(newTracks.map((t) => makeTrackData(t)))
      await TrackPlayer.add(resolved)
    },
    [makeTrackData]
  )

  // --- handleQueueChange: decides reset vs append ---
  const handleQueueChange = useCallback(async () => {
    const refTrackIds = queueListRef.current

    // Wait for all track + owner data to be loaded before touching RNTP
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

    const isQueueAppend =
      refTrackIds.length > 0 &&
      isEqual(queueTrackIds.slice(0, refTrackIds.length), refTrackIds) &&
      !didPlayerBehaviorChange

    if (isQueueAppend) {
      await appendToQueue(queueTracks.slice(refTrackIds.length))
    } else {
      await resetQueue(queueTracks, queueIndex)
    }
  }, [
    queueTracks,
    queueIndex,
    queueTrackIds,
    didOfflineToggleChange,
    didPlayerBehaviorChange,
    queueTrackOwnersMap,
    appendToQueue,
    resetQueue
  ])

  // --- handleQueueIdxChange: skip within a synced queue ---
  const latestQueueIdxRef = useRef<number>(-1)

  const handleQueueIdxChange = useCallback(async () => {
    if (queueIndex === -1) return

    // If RNTP queue hasn't been rebuilt to match the current redux queue,
    // bail out. handleQueueChange will load the correct track when it fires.
    if (!isEqual(queueListRef.current, queueTrackIds)) return

    latestQueueIdxRef.current = queueIndex

    const playerIdx = await TrackPlayer.getActiveTrackIndex()
    if (queueIndex !== playerIdx) {
      const queue = await TrackPlayer.getQueue()
      if (queueIndex < queue.length) {
        await TrackPlayer.skip(queueIndex)
      }
    }
  }, [queueIndex, queueTrackIds])

  // Store the skip promise so handleTogglePlay can await it
  const queueIdxChangeJobRef = useRef<Promise<void> | undefined>(undefined)

  // --- Effects ---
  useEffect(() => {
    if (isAudioSetup) {
      handleQueueChange()
    }
  }, [handleQueueChange, queueTrackIds, isAudioSetup])

  useAsync(async () => {
    if (isAudioSetup && didPlayerBehaviorChange) {
      const updatedTrack = await makeTrackData(queueTracks[queueIndex])
      await TrackPlayer.load(updatedTrack)
      dispatch(
        playbackActions.set({
          previewing: calculatePlayerBehavior(
            queueTracks[queueIndex].track,
            queueTracks[queueIndex].playerBehavior
          ).shouldPreview,
          trackId: queueTracks[queueIndex].track?.track_id ?? 0,
          index: queueIndex
        })
      )
    }
  }, [didPlayerBehaviorChange])

  useEffect(() => {
    if (isAudioSetup) {
      queueIdxChangeJobRef.current = handleQueueIdxChange()
    }
  }, [handleQueueIdxChange, queueIndex, isAudioSetup])

  return {
    queueIndex,
    queueTracks,
    queueIdxChangeJobRef,
    makeTrackData,
    retries,
    currentUserId
  }
}

// ---------------------------------------------------------------------------
// Hook: usePlaybackEvents
// ---------------------------------------------------------------------------
/** Handles all RNTP events: errors, remote controls, track changes. */
const usePlaybackEvents = ({
  queueIndex,
  queueTracks,
  makeTrackData,
  retries,
  currentUserId
}: {
  queueIndex: number
  queueTracks: QueueableTrack[]
  makeTrackData: (t: QueueableTrack, retries?: number) => Promise<any>
  retries: number
  currentUserId: Nullable<ID> | undefined
}) => {
  const dispatch = useDispatch()
  const track = useCurrentTrack()
  const playing = useSelector(getPlaying)
  const playbackRate = useSelector(getPlaybackRate)
  const playerBehavior = useSelector(getPlayerBehavior)
  const trackPositions = useSelector((state: CommonState) =>
    getUserTrackPositions(state, { userId: currentUserId })
  )

  const [bufferStartTime, setBufferStartTime] = useState<number>()
  const { bufferingDuringPlay } = useIsPlaying()
  const previousBufferingState = usePrevious(bufferingDuringPlay)

  // Sync buffering state to redux
  useEffect(() => {
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

  const seekToRef = useRef<number | null>(null)

  const setSeekPosition = useCallback(async (seekPos = 0) => {
    const { state } = await TrackPlayer.getPlaybackState()
    const isSeekableState = state === State.Playing || state === State.Ready
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

  // Register PlaybackState listener once
  useEffect(() => {
    const subscription = TrackPlayer.addEventListener(
      Event.PlaybackState,
      handlePlayerStateChange
    )
    return () => subscription.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- register once
  }, [])

  const isLongFormContentRef = useRef<boolean>(false)

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

  useTrackPlayerEvents(playerEvents, async (event) => {
    const { duration, position } = await TrackPlayer.getProgress()

    // --- Playback error: retry with fresh stream URL ---
    if (event.type === Event.PlaybackError) {
      console.error(`TrackPlayer Playback Error:`, event)
      const updatedTrack = await makeTrackData(
        { track, playerBehavior },
        retries + 1
      )
      TrackPlayer.load(updatedTrack)
      return
    }

    // --- Remote controls ---
    if (event.type === Event.RemotePlay || event.type === Event.RemotePause) {
      playing
        ? dispatch(playbackActions.pause())
        : dispatch(playbackActions.play())
      return
    }
    if (event.type === Event.RemoteNext) {
      dispatch(playbackActions.next())
      return
    }
    if (event.type === Event.RemotePrevious) {
      if (position > RESTART_THRESHOLD_SEC) {
        setSeekPosition(0)
      } else {
        dispatch(playbackActions.previous())
      }
      return
    }
    if (event.type === Event.RemoteSeek) {
      setSeekPosition(event.position)
      return
    }
    if (event.type === Event.RemoteJumpForward) {
      setSeekPosition(Math.min(duration, position + SKIP_DURATION_SEC))
      return
    }
    if (event.type === Event.RemoteJumpBackward) {
      setSeekPosition(Math.max(0, position - SKIP_DURATION_SEC))
      return
    }

    // --- Active track changed ---
    if (event.type === Event.PlaybackActiveTrackChanged) {
      setBufferStartTime(performance.now())
      const playerIndex = await TrackPlayer.getActiveTrackIndex()
      if (playerIndex === undefined) return

      // RNTP auto-advanced to next track. The redux queue is always in
      // playable order (shuffled or not), so RNTP and redux indices align.
      if (playerIndex > queueIndex) {
        const { track: nextTrack, playerBehavior: nextBehavior } =
          queueTracks[playerIndex] ?? {}
        const { shouldSkip, shouldPreview } = calculatePlayerBehavior(
          nextTrack,
          nextBehavior
        )

        if (!nextTrack || shouldSkip) {
          dispatch(playbackActions.next())
        } else {
          dispatch(playbackActions.setIndex({ index: playerIndex }))
          dispatch(
            playbackActions.set({
              previewing: shouldPreview,
              trackId: nextTrack.track_id,
              index: playerIndex
            })
          )

          const trackPosition = trackPositions?.[nextTrack.track_id]
          if (trackPosition?.status === 'IN_PROGRESS') {
            dispatch(
              playbackActions.seekTo({
                seconds: trackPosition.playbackPosition
              })
            )
          } else if (isLongFormContent(nextTrack)) {
            dispatch(
              setTrackPosition({
                userId: currentUserId,
                trackId: nextTrack.track_id,
                positionInfo: {
                  status: 'IN_PROGRESS',
                  playbackPosition: 0
                }
              })
            )
          }
        }
      }

      // Update playback rate & lock screen controls for long-form content
      const currentTrack = queueTracks[playerIndex]?.track
      const isLongForm = isLongFormContent(currentTrack)
      const newRate = isLongForm ? playbackRateValueMap[playbackRate] : 1.0
      await TrackPlayer.setRate(newRate)

      if (isLongForm !== isLongFormContentRef.current) {
        isLongFormContentRef.current = isLongForm
        await updatePlayerOptions(isLongForm)
      }

      // Handle completed long-form track
      if (event?.lastPosition !== undefined && event?.index !== undefined) {
        const { track: endedTrack } = queueTracks[event.index] ?? {}
        if (
          isLongFormContent(endedTrack) &&
          endedTrack?.duration &&
          event.lastPosition >= endedTrack.duration - TRACK_END_BUFFER
        ) {
          dispatch(
            setTrackPosition({
              userId: currentUserId,
              trackId: endedTrack.track_id,
              positionInfo: { status: 'COMPLETED', playbackPosition: 0 }
            })
          )
        }
      }
    }
  })

  return { setSeekPosition }
}

// ---------------------------------------------------------------------------
// Hook: usePlaybackControls
// ---------------------------------------------------------------------------
/** Play/pause toggle, seek, repeat, rate, stop. */
const usePlaybackControls = (
  isAudioSetup: boolean,
  queueIdxChangeJobRef: React.MutableRefObject<Promise<void> | undefined>,
  setSeekPosition: (seekPos?: number) => Promise<void>
) => {
  const playing = useSelector(getPlaying)
  const seek = useSelector(getSeek)
  const counter = useSelector(getCounter)
  const repeatMode = useSelector(getRepeat)
  const playbackRate = useSelector(getPlaybackRate)
  const playingTrackId = useSelector(getTrackId)
  const previousPlayingTrackId = usePrevious(playingTrackId)
  const queueIndex = useSelector(getIndex)

  // --- Toggle play/pause ---
  const handleTogglePlay = useCallback(async () => {
    if (playing) {
      await queueIdxChangeJobRef.current
      await TrackPlayer.play()
    } else {
      await TrackPlayer.pause()
    }
  }, [playing, queueIdxChangeJobRef])

  // --- Repeat mode ---
  const handleRepeatModeChange = useCallback(async () => {
    if (repeatMode === RepeatMode.SINGLE) {
      await TrackPlayer.setRepeatMode(TrackPlayerRepeatMode.Track)
    } else if (repeatMode === RepeatMode.ALL) {
      await TrackPlayer.setRepeatMode(TrackPlayerRepeatMode.Queue)
    } else {
      await TrackPlayer.setRepeatMode(TrackPlayerRepeatMode.Off)
    }
  }, [repeatMode])

  // --- Playback rate ---
  const isLongFormContentRef = useRef<boolean>(false)
  const handlePlaybackRateChange = useCallback(async () => {
    if (!isLongFormContentRef.current) return
    await TrackPlayer.setRate(playbackRateValueMap[playbackRate])
  }, [playbackRate])

  // --- Seek handler ---
  useEffect(() => {
    if (seek !== null) {
      setSeekPosition(seek)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek])

  // --- Counter/restart handler ---
  const counterRef = useRef<number | null>(null)
  const counterTrackIndex = useRef<number | null>(null)

  useEffect(() => {
    if (counter !== counterRef.current) {
      counterRef.current = counter
      if (queueIndex === counterTrackIndex.current) setSeekPosition(0)
      counterTrackIndex.current = queueIndex
    }
  }, [counter, queueIndex, setSeekPosition])

  // --- Effects ---
  useEffect(() => {
    if (isAudioSetup) handleRepeatModeChange()
  }, [handleRepeatModeChange, repeatMode, isAudioSetup])

  useEffect(() => {
    if (isAudioSetup) handleTogglePlay()
  }, [handleTogglePlay, playing, isAudioSetup])

  useEffect(() => {
    handlePlaybackRateChange()
  }, [handlePlaybackRateChange, playbackRate])

  useEffect(() => {
    if (previousPlayingTrackId && !playingTrackId && !playing) {
      TrackPlayer.reset()
    }
  }, [playing, playingTrackId, previousPlayingTrackId])
}

// ---------------------------------------------------------------------------
// Hook: useRecordListen
// ---------------------------------------------------------------------------
/** Records a listen event after a short delay. */
const useRecordListen = () => {
  const dispatch = useDispatch()
  const track = useCurrentTrack()
  const counter = useSelector(getCounter)
  const isReachable = useSelector(getIsReachable)

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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const AudioPlayer = () => {
  useChromecast()

  const isAudioSetup = useAudioPlayerSetup()

  const {
    queueIndex,
    queueTracks,
    queueIdxChangeJobRef,
    makeTrackData,
    retries,
    currentUserId
  } = useQueueSync(isAudioSetup)

  const { setSeekPosition } = usePlaybackEvents({
    queueIndex,
    queueTracks,
    makeTrackData,
    retries,
    currentUserId
  })

  usePlaybackControls(isAudioSetup, queueIdxChangeJobRef, setSeekPosition)
  useRecordListen()
  useSavePodcastProgress()

  return null
}
