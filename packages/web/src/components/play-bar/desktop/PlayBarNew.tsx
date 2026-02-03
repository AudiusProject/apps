import { useCallback, useEffect, useRef, useState } from 'react'

import { useCurrentUserId, useTrack, useUser } from '@audius/common/api'
import { Name, PlaybackSource } from '@audius/common/models'
import {
  playbackActions,
  getCurrentTrackId,
  getLineupId,
  getIsPlaying,
  getIsBuffering,
  getPlaybackRate,
  playbackRateValueMap,
  RepeatMode
} from '@audius/common/store'
import { Genre, route } from '@audius/common/utils'
import { removeHotkeys, setupHotkeys, Scrubber } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import PlayButton from 'components/play-bar/PlayButton'
import VolumeBar from 'components/play-bar/VolumeBar'
import NextButtonProvider from 'components/play-bar/next-button/NextButtonProvider'
import PreviousButtonProvider from 'components/play-bar/previous-button/PreviousButtonProvider'
import RepeatButtonProvider from 'components/play-bar/repeat-button/RepeatButtonProvider'
import ShuffleButtonProvider from 'components/play-bar/shuffle-button/ShuffleButtonProvider'
import { audioPlayer } from 'services/audio-player'
import { push } from 'utils/navigation'

import { PlaybackRateButton } from '../playback-rate-button/PlaybackRateButton'

import styles from './PlayBar.module.css'
import PlayingTrackInfo from './components/PlayingTrackInfo'
import { SocialActions } from './components/SocialActions'

const { profilePage } = route

const SKIP_DURATION_SEC = 15
const RESTART_THRESHOLD_SEC = 3
const VOLUME_GRANULARITY = 100

const PlayBarNew = () => {
  const dispatch = useDispatch()
  const { data: accountUserId } = useCurrentUserId()

  // New playback state
  const currentTrackId = useSelector(getCurrentTrackId)
  const lineupId = useSelector(getLineupId)
  const isPlaying = useSelector(getIsPlaying)
  const isBuffering = useSelector(getIsBuffering)
  const playbackRate = useSelector(getPlaybackRate)

  // Get track data
  const { data: currentTrack } = useTrack(currentTrackId, {
    select: (track) => ({
      title: track?.title,
      owner_id: track?.owner_id,
      permalink: track?.permalink,
      track_id: track?.track_id,
      is_unlisted: track?.is_unlisted,
      is_stream_gated: track?.is_stream_gated,
      genre: track?.genre
    })
  })

  const { data: currentUser } = useUser(currentTrack?.owner_id, {
    select: (user) => ({
      name: user?.name,
      handle: user?.handle,
      user_id: user?.user_id,
      is_verified: user?.is_verified
    })
  })

  // Local state
  const [initialVolume, setInitialVolume] = useState<number | null>(null)
  const [mediaKey, setMediaKey] = useState(0)
  const [timing, setTiming] = useState({ position: 0, duration: 0 })

  const hotkeysHook = useRef<any>(null)
  const seekInterval = useRef<number | undefined>(undefined)

  // Memoized values
  const trackTitle = currentTrack?.title || ''
  const artistName = currentUser?.name || ''
  const artistHandle = currentUser?.handle || ''
  const artistUserId = currentUser?.user_id || null
  const isVerified = currentUser?.is_verified || false
  const trackId = currentTrack?.track_id || null
  const duration = timing.duration || audioPlayer?.getDuration() || null
  const isOwner = currentTrack?.owner_id === accountUserId
  const isTrackUnlisted = currentTrack?.is_unlisted || false
  const isStreamGated = currentTrack?.is_stream_gated || false
  const trackPermalink = currentTrack?.permalink || ''
  const isLongFormContent =
    currentTrack?.genre === Genre.PODCASTS ||
    currentTrack?.genre === Genre.AUDIOBOOKS

  const playable = !!currentTrackId

  // Update timing state
  const startSeeking = useCallback(() => {
    clearInterval(seekInterval.current)
    seekInterval.current = window.setInterval(async () => {
      if (!audioPlayer) return
      const position = await audioPlayer.getPosition()
      const duration = await audioPlayer.getDuration()
      setTiming({ position, duration })
    }, 500)
  }, [setTiming])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (seekInterval.current) clearInterval(seekInterval.current)
    }
  }, [seekInterval])

  // Start seeking when track changes
  useEffect(() => {
    if (currentTrackId) {
      setMediaKey((prev) => prev + 1)
      setTiming({ position: 0, duration: timing.duration })
      startSeeking()
    }
  }, [currentTrackId, startSeeking, timing.duration])

  // Play button status
  let playButtonStatus: 'load' | 'pause' | 'play'
  if (isBuffering) {
    playButtonStatus = 'load'
  } else if (isPlaying) {
    playButtonStatus = 'pause'
  } else {
    playButtonStatus = 'play'
  }

  // Handlers
  const goToTrackPage = useCallback(() => {
    if (currentTrack) {
      dispatch(push(currentTrack.permalink))
    }
  }, [currentTrack, dispatch])

  const goToArtistPage = useCallback(() => {
    if (artistHandle) {
      dispatch(push(profilePage(artistHandle)))
    }
  }, [artistHandle, dispatch])

  const togglePlay = useCallback(() => {
    if (audioPlayer && isPlaying) {
      dispatch(playbackActions.pause({}))
      dispatch(
        make(Name.PLAYBACK_PAUSE, {
          id: trackId,
          source: PlaybackSource.PLAYBAR
        })
      )
    } else if (playable && currentTrackId && lineupId) {
      // Resume playback from current track
      dispatch(playbackActions.play({ lineupId, trackId: currentTrackId }))
      dispatch(
        make(Name.PLAYBACK_PLAY, {
          id: trackId,
          source: PlaybackSource.PLAYBAR
        })
      )
    }
  }, [isPlaying, playable, dispatch, trackId, currentTrackId, lineupId])

  const updateVolume = useCallback((volume: number) => {
    if (audioPlayer) {
      audioPlayer.setVolume(volume / VOLUME_GRANULARITY)
    } else {
      setInitialVolume(volume / VOLUME_GRANULARITY)
    }
  }, [])

  const repeatAll = useCallback(() => {
    dispatch(playbackActions.setRepeat({ mode: RepeatMode.ALL }))
  }, [dispatch])

  const repeatSingle = useCallback(() => {
    dispatch(playbackActions.setRepeat({ mode: RepeatMode.SINGLE }))
  }, [dispatch])

  const repeatOff = useCallback(() => {
    dispatch(playbackActions.setRepeat({ mode: RepeatMode.OFF }))
  }, [dispatch])

  const shuffleOn = useCallback(() => {
    dispatch(playbackActions.setShuffle({ enabled: true }))
  }, [dispatch])

  const shuffleOff = useCallback(() => {
    dispatch(playbackActions.setShuffle({ enabled: false }))
  }, [dispatch])

  const onPrevious = useCallback(() => {
    if (isLongFormContent) {
      const position = timing.position || 0
      const newPosition = position - SKIP_DURATION_SEC
      dispatch(playbackActions.seek({ seconds: Math.max(0, newPosition) }))
      setMediaKey((prev) => prev + 1)
    } else {
      const position = timing.position || 0
      const shouldGoToPrevious = position < RESTART_THRESHOLD_SEC
      if (shouldGoToPrevious) {
        dispatch(playbackActions.previous({}))
      } else {
        dispatch(playbackActions.seek({ seconds: 0 }))
        if (isPlaying) {
          // Resume playing from start
          if (currentTrackId && lineupId) {
            dispatch(
              playbackActions.play({ lineupId, trackId: currentTrackId })
            )
          }
        }
      }
    }
  }, [
    isLongFormContent,
    dispatch,
    timing.position,
    isPlaying,
    currentTrackId,
    lineupId
  ])

  const onNext = useCallback(() => {
    if (isLongFormContent) {
      const duration = timing.duration || 0
      const position = timing.position || 0
      const newPosition = position + SKIP_DURATION_SEC
      dispatch(
        playbackActions.seek({ seconds: Math.min(newPosition, duration) })
      )
      setMediaKey((prev) => prev + 1)
    } else {
      dispatch(playbackActions.next({}))
    }
  }, [isLongFormContent, dispatch, timing.position, timing.duration])

  // Effects
  useEffect(() => {
    hotkeysHook.current = setupHotkeys(
      {
        32 /* space */: togglePlay,
        37 /* left arrow */: onPrevious,
        39 /* right arrow */: onNext
      },
      /* throttle= */ 200
    )

    return () => {
      if (hotkeysHook.current) {
        removeHotkeys(hotkeysHook.current)
      }
    }
  }, [togglePlay, onPrevious, onNext])

  useEffect(() => {
    if (initialVolume !== null && audioPlayer) {
      audioPlayer.setVolume(initialVolume)
      setInitialVolume(null)
    }
  }, [initialVolume])

  // Only render if we have a track playing from new playback system
  if (!currentTrackId || !lineupId) {
    return null
  }

  return (
    <div className={styles.playBar}>
      <div className={styles.playBarContentWrapper}>
        <div className={styles.playBarPlayingInfo}>
          {trackId && artistUserId ? (
            <PlayingTrackInfo
              trackId={trackId}
              isOwner={isOwner}
              trackTitle={trackTitle}
              trackPermalink={trackPermalink}
              artistName={artistName}
              artistHandle={artistHandle}
              artistUserId={artistUserId}
              isVerified={isVerified}
              isTrackUnlisted={isTrackUnlisted}
              isStreamGated={isStreamGated}
              onClickTrackTitle={goToTrackPage}
              onClickArtistName={goToArtistPage}
              hasShadow={false}
            />
          ) : null}
        </div>

        <div className={styles.playBarControls}>
          <div className={styles.timeControls}>
            {audioPlayer ? (
              <Scrubber
                mediaKey={`${currentTrackId}${mediaKey}${timing.duration}`}
                isPlaying={isPlaying && !isBuffering}
                isDisabled={!currentTrackId}
                includeTimestamps
                getAudioPosition={audioPlayer?.getPosition}
                getTotalTime={audioPlayer?.getDuration}
                playbackRate={
                  isLongFormContent ? playbackRateValueMap[playbackRate] : 1
                }
                elapsedSeconds={timing.position}
                totalSeconds={duration ?? 0}
                style={{
                  railListenedColor: 'var(--track-slider-rail)',
                  handleColor: 'var(--track-slider-handle)'
                }}
                onScrubRelease={(position: number) =>
                  dispatch(playbackActions.seek({ seconds: position }))
                }
              />
            ) : null}
          </div>

          <div className={styles.buttonControls}>
            <div className={styles.shuffleButton}>
              {isLongFormContent ? null : (
                <ShuffleButtonProvider
                  onShuffleOn={shuffleOn}
                  onShuffleOff={shuffleOff}
                />
              )}
            </div>
            <div className={styles.previousButton}>
              <PreviousButtonProvider onClick={onPrevious} isMobile={false} />
            </div>
            <div className={styles.playButton}>
              <PlayButton
                playable={playable}
                status={playButtonStatus}
                onClick={togglePlay}
              />
            </div>
            <div className={styles.nextButton}>
              <NextButtonProvider onClick={onNext} isMobile={false} />
            </div>
            <div className={styles.repeatButton}>
              {isLongFormContent ? (
                <PlaybackRateButton isMobile={false} />
              ) : (
                <RepeatButtonProvider
                  onRepeatOff={repeatOff}
                  onRepeatAll={repeatAll}
                  onRepeatSingle={repeatSingle}
                />
              )}
            </div>
          </div>
        </div>

        <div className={styles.optionsRight}>
          <VolumeBar
            defaultValue={100}
            granularity={VOLUME_GRANULARITY}
            onChange={updateVolume}
          />
          {trackId ? (
            <SocialActions
              trackId={trackId}
              uid={`tracks:${trackId}:${lineupId || 'explore'}`}
              isOwner={isOwner}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PlayBarNew
