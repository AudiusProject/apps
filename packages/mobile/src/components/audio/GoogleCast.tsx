import { useCallback, useEffect, useState } from 'react'

import { useUser } from '@audius/common/api'
import { useCurrentTrack, useImageSize } from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import {
  castActions,
  playbackSelectors,
  playbackActions
} from '@audius/common/store'
import {
  CastState,
  MediaPlayerState,
  useCastSession,
  useCastState,
  useMediaStatus,
  useRemoteMediaClient
} from 'react-native-google-cast'
import TrackPlayer, { Event } from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync, usePrevious } from 'react-use'

const { setIsCasting } = castActions
const { getPlaying, getSeek, getCounter } = playbackSelectors

export { CastState, MediaPlayerState } from 'react-native-google-cast'

export const useChromecast = () => {
  const dispatch = useDispatch()

  // Data hooks
  const counter = useSelector(getCounter)
  const track = useCurrentTrack()
  const prevTrack = usePrevious(track)
  const playing = useSelector(getPlaying)
  const seek = useSelector(getSeek)

  const { data: owner } = useUser(track?.owner_id)

  // Cast hooks
  const client = useRemoteMediaClient()
  const castState = useCastState()
  const mediaStatus = useMediaStatus()
  const castSession = useCastSession()
  const previousCastState = usePrevious(castState)

  const [internalCounter, setInternalCounter] = useState(0)
  const { imageUrl } = useImageSize({
    artwork: track?.artwork,
    targetSize: SquareSizes.SIZE_1000_BY_1000
  })

  const loadCast = useCallback(
    async (track, startTime, contentUrl) => {
      if (client && track && owner && contentUrl && imageUrl) {
        client.loadMedia({
          mediaInfo: {
            contentUrl,
            metadata: {
              type: 'musicTrack',
              images: [
                {
                  url: imageUrl
                }
              ],
              title: track.title,
              artist: owner.name
            }
          },
          startTime
        })
      }
    },
    [client, owner, imageUrl]
  )

  const playCast = useCallback(() => {
    client?.play()
  }, [client])

  const pauseCast = useCallback(() => {
    client?.pause()
  }, [client])

  // Update our cast UI when the cast device connects
  useEffect(() => {
    if (castState !== CastState.CONNECTED) {
      // Tag the disconnect with method:'chromecast' so the reducer only
      // clears state if chromecast was the active method — symmetric with
      // Airplay.tsx so the two listeners don't clobber each other.
      dispatch(setIsCasting({ isCasting: false, method: 'chromecast' }))
      return
    }
    let cancelled = false
    const resolve = async () => {
      const device = await castSession?.getCastDevice()
      if (cancelled) return
      dispatch(
        setIsCasting({
          isCasting: true,
          method: 'chromecast',
          deviceName: device?.friendlyName ?? null
        })
      )
    }
    resolve()
    return () => {
      cancelled = true
    }
  }, [castState, castSession, dispatch])

  // Ensure that the progress gets reset to 0
  // when a new track is played
  useEffect(() => {
    if (prevTrack && prevTrack !== track && counter !== internalCounter) {
      setInternalCounter(0)
    }
  }, [prevTrack, track, counter, internalCounter, setInternalCounter])

  // Load media when the cast connects
  useAsync(async () => {
    if (castState === CastState.CONNECTED) {
      const { position: currentPosition } = await TrackPlayer.getProgress()
      const currentPlaying = await TrackPlayer.getActiveTrack()
      if (currentPlaying) {
        loadCast(track, currentPosition, currentPlaying?.url)
      } else {
        // If nothing is currently playing, listen for something to start
        // playing and then load it to cast.
        TrackPlayer.addEventListener(
          Event.PlaybackActiveTrackChanged,
          async () => {
            const { position: currentPosition } =
              await TrackPlayer.getProgress()
            const currentPlaying = await TrackPlayer.getActiveTrack()
            loadCast(track, currentPosition, currentPlaying?.url)
          }
        )
      }
    }
  }, [castState, track, loadCast])

  // Play & pause the cast device
  useEffect(() => {
    if (castState === CastState.CONNECTED) {
      if (playing) {
        playCast()
      } else {
        pauseCast()
      }
    }
  }, [playing, playCast, pauseCast, castState])

  // Set buffering state when cast is buffering
  useEffect(() => {
    if (
      castState === CastState.CONNECTING ||
      ((mediaStatus === undefined ||
        mediaStatus?.playerState === undefined ||
        mediaStatus?.playerState === MediaPlayerState.IDLE ||
        mediaStatus?.playerState === MediaPlayerState.LOADING ||
        mediaStatus?.playerState === MediaPlayerState.BUFFERING) &&
        castState !== CastState.NOT_CONNECTED)
    ) {
      dispatch(playbackActions.setBuffering({ buffering: true }))
    } else {
      dispatch(playbackActions.setBuffering({ buffering: false }))
    }
  }, [mediaStatus, castState, dispatch])

  // Seek the cast device
  useEffect(() => {
    if (seek !== null) {
      client?.seek({ position: seek })
    }
  }, [client, seek])

  // Mute the track player if we are connecting to cast
  useEffect(() => {
    if (
      castState === CastState.CONNECTED ||
      castState === CastState.CONNECTING
    ) {
      TrackPlayer.setVolume(0)
    }
  }, [castState])

  // Handle disconnection from cast device
  useEffect(() => {
    if (
      castState === CastState.NOT_CONNECTED &&
      previousCastState === CastState.CONNECTED
    ) {
      TrackPlayer.setVolume(1)
      dispatch(playbackActions.pause())
    }
  }, [castState, previousCastState, dispatch])

  return {
    castState
  }
}
