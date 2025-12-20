import { useRef, useEffect, useCallback, useState, useMemo } from 'react'

import { useCurrentUserId, useTracks, useUsers } from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import { ErrorLevel, Feature, Name } from '@audius/common/models'
import type { ID, Track } from '@audius/common/models'
import {
  libraryPageTracksLineupActions,
  queueActions,
  queueSelectors,
  RepeatMode,
  reachabilitySelectors,
  tracksSocialActions,
  playerActions,
  playerSelectors,
  playbackRateValueMap,
  playbackPositionActions,
  playbackPositionSelectors,
  gatedContentSelectors,
  calculatePlayerBehavior,
  PlayerBehavior
} from '@audius/common/store'
import type { Queueable, CommonState } from '@audius/common/store'
import {
  Genre,
  removeNullable,
  getTrackPreviewDuration
} from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { getMirrorStreamUrl } from '@audius/web/src/common/store/player/sagas'
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

const { getPlaying, getSeek, getCounter, getPlaybackRate, getUid } =
  playerSelectors
const { setTrackPosition } = playbackPositionActions
const { getUserTrackPositions } = playbackPositionSelectors
const { recordListen } = tracksSocialActions
const { getPlayerBehavior } = queueSelectors
const {
  getIndex,
  getOrder,
  getSource,
  getCollectionId,
  getRepeat,
  getShuffle
} = queueSelectors
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
} & Pick<Queueable, 'playerBehavior'>

export const AudioPlayer = () => {
  const track = useCurrentTrack()
  const playing = useSelector(getPlaying)
  const seek = useSelector(getSeek)
  const counter = useSelector(getCounter)
  const repeatMode = useSelector(getRepeat)
  const playbackRate = useSelector(getPlaybackRate)
  const { data: currentUserId } = useCurrentUserId()
  const uid = useSelector(getUid)
  const playerBehavior = useSelector(getPlayerBehavior)
  const previousUid = usePrevious(uid)
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
  const queueOrder = useSelector(getOrder)
  const queueSource = useSelector(getSource)
  const queueCollectionId = useSelector(getCollectionId)
  const queueTrackUids = useMemo(
    () => queueOrder.map((trackData) => trackData.uid),
    [queueOrder]
  )
  const queueTrackIds = useMemo(
    () => queueOrder.map((trackData) => trackData.id as ID),
    [queueOrder]
  )

  const { byId: tracksById } = useTracks(uniq(queueTrackIds))
  const queueTracks = useMemo(
    () =>
      queueOrder.map(({ id, playerBehavior }) => ({
        track: tracksById[id],
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
      queueSource === libraryPageTracksLineupActions.prefix
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

  const play = useCallback(() => dispatch(playerActions.play()), [dispatch])
  const pause = useCallback(() => dispatch(playerActions.pause()), [dispatch])
  const next = useCallback(() => dispatch(queueActions.next()), [dispatch])
  const previous = useCallback(
    () => dispatch(queueActions.previous()),
    [dispatch]
  )

  const reset = useCallback(
    () => dispatch(playerActions.reset({ shouldAutoplay: false })),
    [dispatch]
  )
  const updateQueueIndex = useCallback(
    (index: number) => dispatch(queueActions.updateIndex({ index })),
    [dispatch]
  )
  const updatePlayerInfo = useCallback(
    ({
      previewing,
      trackId,
      uid
    }: {
      previewing: boolean
      trackId: number
      uid: string
    }) => {
      dispatch(playerActions.set({ previewing, trackId, uid }))
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
      dispatch(playerActions.setBuffering({ buffering: bufferingDuringPlay }))
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

        const contentNodeStreamUrl = getMirrorStreamUrl(
          track,
          shouldPreview,
          retries ?? 0
        )
        if (offlineTrackAvailable && isCollectionMarkedForDownload) {
          const audioFilePath = getLocalAudioPath(trackId)
          url = `file://${audioFilePath}`
        } else if (contentNodeStreamUrl) {
          url = contentNodeStreamUrl
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
          track.artwork['1000x1000'] ??
          DEFAULT_IMAGE_URL

        return {
          url,
          type: TrackType.Default,
          title: track.title,
          artist: trackOwner.name,
          genre: track.genre,
          date: track.created_at,
          artwork: imageUrl,
          imageUrl, // react-native-track-player v5 may require both artwork and imageUrl
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
      await enqueueTracksJobRef.current
      const playerIndex = await TrackPlayer.getActiveTrackIndex()
      if (playerIndex === undefined) return

      // Update player info when track changes (including when first track starts)
      // This ensures trackId and uid are set in player state so UI components can fetch track data
      if (playerIndex >= 0 && playerIndex < queueTracks.length) {
        const { track, playerBehavior } = queueTracks[playerIndex] ?? {}

        if (track) {
          const { shouldSkip, shouldPreview } = calculatePlayerBehavior(
            track,
            playerBehavior
          )

          // Skip track if user does not have access i.e. for an unlocked gated track
          if (shouldSkip) {
            next()
            return
          }

          // Update player info for the current track
          updatePlayerInfo({
            previewing: shouldPreview,
            trackId: track.track_id,
            uid: queueTrackUids[playerIndex]
          })

          // Update queue and player state if the track player auto plays next track
          if (playerIndex > queueIndex) {
            if (queueShuffle) {
              // TODO: There will be a very short period where the next track in the queue is played instead of the next shuffle track.
              // Figure out how to call next earlier
              next()
            } else {
              // Track Player natively went to the next track
              // Update queue info and handle playback position updates
              updateQueueIndex(playerIndex)

              const isLongFormContent =
                track?.genre === Genre.PODCASTS ||
                track?.genre === Genre.AUDIOBOOKS
              const trackPosition = trackPositions?.[track.track_id]
              if (trackPosition?.status === 'IN_PROGRESS') {
                dispatch(
                  playerActions.seek({
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
      }

      const isLongFormContent =
        queueTracks[playerIndex]?.track?.genre === Genre.PODCASTS ||
        queueTracks[playerIndex]?.track?.genre === Genre.AUDIOBOOKS

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
          track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
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

  TrackPlayer.addEventListener(Event.PlaybackState, handlePlayerStateChange)

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

  // Ref to keep track of the queue in the track player vs the queue in state
  const queueListRef = useRef<string[]>([])

  // A ref to the enqueue task to await before either requeing or appending to queue
  const enqueueTracksJobRef = useRef<Promise<void> | undefined>(undefined)
  // A way to abort the enqeue tracks job if a new lineup is played
  const abortEnqueueControllerRef = useRef(new AbortController())

  const handleQueueChange = useCallback(async () => {
    const refUids = queueListRef.current

    // Due to a dependency waterfall (queue from redux -> useTracks -> useUsers),
    // we need to wait for all 3 things to be loaded before loading anything into RNTP - queue + tracks + users
    // Original bug: https://linear.app/audius/issue/QA-2255/keeps-playing-the-same-track-when-clicking-new-tracks-in-the-same
    if (
      !queueTracks.every(
        ({ track }) =>
          !!track?.track_id && !!queueTrackOwnersMap[track.owner_id]
      )
    ) {
      return
    }
    if (queueIndex === -1) {
      return
    }
    if (
      isEqual(refUids, queueTrackUids) &&
      !didOfflineToggleChange &&
      !didPlayerBehaviorChange
    ) {
      return
    }

    queueListRef.current = queueTrackUids

    // Checks to allow for continuous playback while making queue updates
    // Check if we are appending to the end of the queue
    const isQueueAppend =
      refUids.length > 0 &&
      isEqual(queueTrackUids.slice(0, refUids.length), refUids) &&
      !didPlayerBehaviorChange

    // If not an append, cancel the enqueue task first
    if (!isQueueAppend) {
      abortEnqueueControllerRef.current.abort()
    }
    // wait for enqueue task to either shut down or finish
    if (enqueueTracksJobRef.current) {
      await enqueueTracksJobRef.current
    }

    // Re-init the abort controller now that the enqueue job is done
    abortEnqueueControllerRef.current = new AbortController()

    // TODO: Queue removal logic was firing too often previously and causing playback issues when at the end of queues. Need to fix
    // Check if we are removing from the end of the queue
    // const isQueueRemoval =
    //   refUids.length > 0 &&
    //   isEqual(refUids.slice(0, queueTrackUids.length), queueTrackUids)

    // if (isQueueRemoval) {
    //   // NOTE: There might be a case where we are trying to remove the currently playing track.
    //   // Shouldn't be possible, but need to keep an eye out for that
    //   const startingRemovalIndex = queueTrackUids.length
    //   const removalLength = refUids.length - queueTrackUids.length
    //   const removalIndexArray = range(removalLength).map(
    //     (i) => i + startingRemovalIndex
    //   )
    //   await TrackPlayer.remove(removalIndexArray)
    //   await TrackPlayer.skip(queueIndex)
    //   return
    // }

    const newQueueTracks = isQueueAppend
      ? queueTracks.slice(refUids.length)
      : queueTracks
    // Enqueue tracks using 'middle-out' to ensure user can ready skip forward or backwards
    const enqueueTracks = async (
      queuableTracks: QueueableTrack[],
      queueIndex = -1
    ) => {
      let currentPivot = 1
      while (
        queueIndex - currentPivot >= 0 ||
        queueIndex + currentPivot < queueTracks.length
      ) {
        if (abortEnqueueControllerRef.current.signal.aborted) {
          return
        }

        const nextTrack = queuableTracks[queueIndex + currentPivot]
        if (nextTrack) {
          const trackData = await makeTrackData(nextTrack)
          await TrackPlayer.add(trackData)
        }

        const previousTrack = queuableTracks[queueIndex - currentPivot]
        if (previousTrack) {
          await TrackPlayer.add(await makeTrackData(previousTrack), 0)
        }
        currentPivot++
      }
    }

    if (isQueueAppend) {
      enqueueTracksJobRef.current = enqueueTracks(newQueueTracks)
      await enqueueTracksJobRef.current
      enqueueTracksJobRef.current = undefined
    } else {
      await TrackPlayer.reset()

      await TrackPlayer.play()

      const firstTrack = newQueueTracks[queueIndex]
      if (!firstTrack) return

      const firstTrackData = await makeTrackData(firstTrack)
      await TrackPlayer.add(firstTrackData)

      // Set player info immediately when first track is added
      // This ensures trackId and uid are set in player state so UI components can fetch track data
      const { shouldPreview } = calculatePlayerBehavior(
        firstTrack.track,
        firstTrack.playerBehavior
      )
      updatePlayerInfo({
        previewing: shouldPreview,
        trackId: firstTrack.track?.track_id ?? 0,
        uid: queueTrackUids[queueIndex]
      })

      enqueueTracksJobRef.current = enqueueTracks(newQueueTracks, queueIndex)
      await enqueueTracksJobRef.current
      enqueueTracksJobRef.current = undefined
    }
  }, [
    queueTracks,
    queueIndex,
    queueTrackUids,
    didOfflineToggleChange,
    didPlayerBehaviorChange,
    queueTrackOwnersMap,
    makeTrackData
  ])

  const handleQueueIdxChange = useCallback(async () => {
    await enqueueTracksJobRef.current
    const playerIdx = await TrackPlayer.getActiveTrackIndex()
    const queue = await TrackPlayer.getQueue()

    if (
      queueIndex !== -1 &&
      queueIndex !== playerIdx &&
      queueIndex < queue.length
    ) {
      await TrackPlayer.skip(queueIndex)
    }
  }, [queueIndex])

  const handleTogglePlay = useCallback(async () => {
    if (playing) {
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
      handleQueueChange()
    }
  }, [handleQueueChange, queueTrackUids, isAudioSetup])

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
        uid: queueTrackUids[queueIndex]
      })
    }
  }, [didPlayerBehaviorChange])

  useEffect(() => {
    if (isAudioSetup) {
      handleQueueIdxChange()
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
    // Stop playback if we have unloaded a uid from the player
    if (previousUid && !uid && !playing) {
      handleStop()
    }
  }, [handleStop, playing, uid, previousUid])

  useSavePodcastProgress()

  return null
}
