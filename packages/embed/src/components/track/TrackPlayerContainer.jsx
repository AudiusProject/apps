import { useState, useContext, useCallback, useEffect, useMemo } from 'react'

import { full } from '@audius/sdk'

import usePlayback from '../../hooks/usePlayback'
import { useRecordListens } from '../../hooks/useRecordListens'
import { useSpacebar } from '../../hooks/useSpacebar'
import { getTrackStreamEndpoint } from '../../util/BedtimeClient'
import { formatGateways } from '../../util/gatewayUtil'
import { getArtworkUrl } from '../../util/getArtworkUrl'
import { getAudiusHostname } from '../../util/getEnv'
import { isMobile } from '../../util/isMobile'
import { logError } from '../../util/logError'
import { PlayerFlavor } from '../app'
import { PauseContext } from '../pausedpopover/PauseProvider'
import { PlayingState } from '../playbutton/PlayButton'

import TrackHelmet from './TrackHelmet'
import TrackPlayerCard from './TrackPlayerCard'
import TrackPlayerCompact from './TrackPlayerCompact'
import TrackPlayerTiny from './TrackPlayerTiny'

const { instanceOfPurchaseGate } = full

const LISTEN_INTERVAL_SECONDS = 1

const TrackPlayerContainer = ({
  flavor,
  track,
  isTwitter,
  backgroundColor,
  did404
}) => {
  const [didInitAudio, setDidInitAudio] = useState(false)
  const { popoverVisibility, setPopoverVisibility } = useContext(PauseContext)

  const onTrackEnd = useCallback(() => {
    if (flavor !== PlayerFlavor.TINY) {
      setPopoverVisibility(true)
    }
  }, [flavor, setPopoverVisibility])

  const {
    playingState,
    duration,
    position,
    loadTrack,
    mediaKey,
    seekTo,
    onTogglePlay,
    initAudio,
    stop,
    audioPlayer
  } = usePlayback(track?.id, onTrackEnd)

  const trackInfoForPlayback = useMemo(() => {
    if (!track?.id) return null
    const isPurchaseable =
      track.streamConditions && instanceOfPurchaseGate(track.streamConditions)

    // Use the track's stream URL if available (works for private tracks)
    // The stream field contains pre-authenticated URLs for tracks fetched via permalink
    let mp3StreamUrl
    if (track.stream) {
      // track.stream can be either:
      // 1. An object with { url, mirrors } (UrlWithMirrors)
      // 2. A string URL (legacy format)
      if (typeof track.stream === 'string') {
        mp3StreamUrl = track.stream
      } else if (track.stream.url) {
        mp3StreamUrl = track.stream.url
      } else if (track.stream.mirrors && track.stream.mirrors.length > 0) {
        // Fall back to first mirror if primary URL not available
        mp3StreamUrl = track.stream.mirrors[0]
      }
    }

    // If no stream URL from track object, construct the endpoint
    // This will only work for public tracks
    // For private tracks accessed via permalink, the stream field should be populated
    if (!mp3StreamUrl) {
      // Log for debugging - remove in production if needed
      if (process.env.NODE_ENV === 'development') {
        console.warn('Track stream URL not found in track object:', {
          trackId: track.id,
          hasStream: !!track.stream,
          streamType: typeof track.stream,
          streamKeys: track.stream ? Object.keys(track.stream) : null
        })
      }
      mp3StreamUrl = getTrackStreamEndpoint(track.id, isPurchaseable)
    }

    return {
      gateways: formatGateways(track.user.creatorNodeEndpoint),
      title: track.title,
      artistName: track.user.name,
      mp3StreamUrl,
      isPurchaseable
    }
  }, [
    track?.id,
    track?.title,
    track?.streamConditions,
    track?.stream,
    track?.user?.creatorNodeEndpoint,
    track?.user?.name
  ])

  const didTogglePlay = useCallback(() => {
    if (!trackInfoForPlayback) return
    if (!didInitAudio) {
      initAudio()
      loadTrack(trackInfoForPlayback)
      setDidInitAudio(true)
    }
    onTogglePlay()
    if (playingState === PlayingState.Playing && flavor !== PlayerFlavor.TINY) {
      setPopoverVisibility(true)
    } else if (playingState === PlayingState.Paused) {
      setPopoverVisibility(false)
    }
  }, [
    didInitAudio,
    onTogglePlay,
    playingState,
    flavor,
    initAudio,
    loadTrack,
    setPopoverVisibility,
    trackInfoForPlayback
  ])

  const playbarEnabled =
    playingState !== PlayingState.Buffering && !popoverVisibility
  useSpacebar(didTogglePlay, playbarEnabled)
  useRecordListens(position, mediaKey, track?.id, LISTEN_INTERVAL_SECONDS)

  // Setup autoplay on twitter
  useEffect(() => {
    const mobile = isMobile()
    if (!isTwitter || mobile || !trackInfoForPlayback) return
    initAudio()
    loadTrack(trackInfoForPlayback)
    setDidInitAudio(true)
    onTogglePlay()
    // TODO: Fix these deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackInfoForPlayback])

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data) {
        try {
          const messageData = JSON.parse(e.data)
          const { from, method, value } = messageData
          if (from && from === 'audiusapi') {
            if (method === 'togglePlay') didTogglePlay()
            if (method === 'stop') stop()
            if (method === 'seekTo' && didInitAudio) seekTo(value)
          }
        } catch (error) {
          logError(error)
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didTogglePlay])

  const [albumArtURL, setAlbumArtURL] = useState(null)
  useEffect(() => {
    if (track) {
      getArtworkUrl(track).then((url) => setAlbumArtURL(url))
    }
  }, [track])

  const hasPremiumExtras =
    track?.isDownloadGated && instanceOfPurchaseGate(track?.downloadConditions)
  const hostname = getAudiusHostname()

  const props = {
    title: track?.title,
    mediaKey,
    handle: track?.user?.handle,
    artistName: track?.user?.name,
    playingState,
    albumArtURL,
    onTogglePlay: didTogglePlay,
    isVerified: track?.user?.isVerified,
    seekTo: didInitAudio ? seekTo : undefined,
    position: didInitAudio ? position : 0,
    duration: didInitAudio ? duration : 0,
    trackURL: `https://${hostname}${track?.permalink}`,
    backgroundColor,
    isTwitter,
    streamConditions: track?.streamConditions,
    did404,
    hasPremiumExtras,
    audioPlayer,
    isRemixContest: track?.events?.some(
      (event) => event.eventType === 'remix_contest'
    ),
    artistCoinLogo: track?.user?.artistCoinBadge?.logoUri,
    balance: track?.user?.totalBalance
  }

  let trackPlayer
  if (flavor === PlayerFlavor.COMPACT) {
    trackPlayer = <TrackPlayerCompact {...props} />
  } else if (flavor === PlayerFlavor.TINY) {
    trackPlayer = <TrackPlayerTiny {...props} />
  } else {
    trackPlayer = <TrackPlayerCard {...props} />
  }
  return (
    <>
      <TrackHelmet track={track} />
      {trackPlayer}
    </>
  )
}

export default TrackPlayerContainer
