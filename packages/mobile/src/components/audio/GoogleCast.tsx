import { useCallback, useEffect, useState } from 'react'

import { SquareSizes } from '@audius/common/models'
import {
  cacheUsersSelectors,
  castActions,
  playerSelectors,
  playerActions
} from '@audius/common/store'
import {
  CastState,
  MediaPlayerState,
  useCastState,
  useMediaStatus,
  useRemoteMediaClient
} from 'react-native-google-cast'
import TrackPlayer, { Event } from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync, usePrevious } from 'react-use'

import { audiusBackendInstance } from 'app/services/audius-backend-instance'

const { setIsCasting } = castActions
const { getCurrentTrack, getPlaying, getSeek, getCounter } = playerSelectors

const { getUser } = cacheUsersSelectors

export { CastState, MediaPlayerState } from 'react-native-google-cast'

export const useChromecast = () => {
  const dispatch = useDispatch()

  // Data hooks
  const counter = useSelector(getCounter)
  const track = useSelector(getCurrentTrack)
  const prevTrack = usePrevious(track)
  const playing = useSelector(getPlaying)
  const seek = useSelector(getSeek)

  const owner = useSelector((state) =>
    getUser(state, {
      id: track?.owner_id
    })
  )

  // Cast hooks
  const client = useRemoteMediaClient()
  const castState = useCastState()
  const mediaStatus = useMediaStatus()
  const previousCastState = usePrevious(castState)

  const [internalCounter, setInternalCounter] = useState(0)

  const loadCast = useCallback(
    async (track, startTime, contentUrl) => {
      if (client && track && owner && contentUrl) {
        const imageUrl = await audiusBackendInstance.getImageUrl(
          track.cover_art_sizes,
          SquareSizes.SIZE_1000_BY_1000,
          track.cover_art_cids
        )

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
    [client, owner]
  )

  const playCast = useCallback(() => {
    client?.play()
  }, [client])

  const pauseCast = useCallback(() => {
    client?.pause()
  }, [client])

  // Update our cast UI when the cast device connects
  useEffect(() => {
    switch (castState) {
      case CastState.CONNECTED:
        dispatch(setIsCasting({ isCasting: true }))
        break
      default:
        dispatch(setIsCasting({ isCasting: false }))
        break
    }
  }, [castState, dispatch])

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
      const currentPosition = await TrackPlayer.getPosition()
      const currentPlaying = await TrackPlayer.getActiveTrack()
      if (currentPlaying) {
        loadCast(track, currentPosition, currentPlaying?.url)
      } else {
        // If nothing is currently playing, listen for something to start
        // playing and then load it to cast.
        TrackPlayer.addEventListener(
          Event.PlaybackActiveTrackChanged,
          async () => {
            const currentPosition = await TrackPlayer.getPosition()
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
      dispatch(playerActions.setBuffering({ buffering: true }))
    } else {
      dispatch(playerActions.setBuffering({ buffering: false }))
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
      dispatch(playerActions.pause())
    }
  }, [castState, previousCastState, dispatch])

  return {
    castState
  }
}
