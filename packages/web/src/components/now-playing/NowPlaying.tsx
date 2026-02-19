import { useCallback, useEffect, useRef, useState } from 'react'

import {
  useCurrentUserId,
  useToggleFavoriteTrack,
  useUser
} from '@audius/common/api'
import { useCurrentTrack, useGatedContentAccess } from '@audius/common/hooks'
import {
  Name,
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  ModalSource,
  SquareSizes,
  ID
} from '@audius/common/models'
import {
  queueActions,
  queueSelectors,
  RepeatMode,
  tracksSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  usePremiumContentPurchaseModal,
  playerActions,
  playerSelectors,
  playbackRateValueMap,
  gatedContentSelectors,
  OverflowActionCallbacks,
  PurchaseableContentType
} from '@audius/common/store'
import { Genre, route } from '@audius/common/utils'
import { IconCaretRight as IconCaret, Scrubber } from '@audius/harmony'
import { Location } from 'history'
import { connect, useSelector } from 'react-redux'
import { Dispatch } from 'redux'

import { useHistoryContext } from 'app/HistoryProvider'
import { useRecord, make } from 'common/store/analytics/actions'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import { LockedStatusBadge } from 'components/locked-status-badge'
import PlayButton from 'components/play-bar/PlayButton'
import NextButtonProvider from 'components/play-bar/next-button/NextButtonProvider'
import PreviousButtonProvider from 'components/play-bar/previous-button/PreviousButtonProvider'
import RepeatButtonProvider from 'components/play-bar/repeat-button/RepeatButtonProvider'
import ShuffleButtonProvider from 'components/play-bar/shuffle-button/ShuffleButtonProvider'
import { PlayButtonStatus } from 'components/play-bar/types'
import { GatedConditionsPill } from 'components/track/GatedConditionsPill'
import { TrackDogEar } from 'components/track/TrackDogEar'
import TrackFlair, { Size } from 'components/track-flair/TrackFlair'
import UserBadges from 'components/user-badges/UserBadges'
import { useRequiresAccountOnClick } from 'hooks/useRequiresAccount'
import {
  useTrackCoverArt,
  useTrackCoverArtDominantColor
} from 'hooks/useTrackCoverArt'
import { audioPlayer } from 'services/audio-player'
import { AppState } from 'store/types'
import { pushUniqueRoute as pushRoute } from 'utils/route'
import { isDarkMode, isMatrix } from 'utils/theme/theme'
import { withNullGuard } from 'utils/withNullGuard'

import styles from './NowPlaying.module.css'
import ActionsBar from './components/ActionsBar'
const { profilePage } = route
const { makeGetCurrent } = queueSelectors
const { getBuffering, getCounter, getPlaying, getPlaybackRate, getSeek } =
  playerSelectors

const { seek, reset } = playerActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const { repostTrack, undoRepostTrack } = tracksSocialActions
const { next, pause, play, previous, repeat, shuffle } = queueActions
const { getGatedContentStatusMap } = gatedContentSelectors

type OwnProps = {
  onClose: () => void
}

type NowPlayingProps = OwnProps &
  ReturnType<ReturnType<typeof makeMapStateToProps>> &
  ReturnType<typeof mapDispatchToProps>

const SEEK_INTERVAL = 200
const RESTART_THRESHOLD_SEC = 3
const SKIP_DURATION_SEC = 15

const messages = {
  nowPlaying: 'Now Playing',
  preview: 'preview'
}

const g = withNullGuard((wide: NowPlayingProps) => {
  const { uid, source } = wide.currentQueueItem
  const currentTrack = useCurrentTrack()
  const { data: user } = useUser(currentTrack?.owner_id)
  if (uid !== null && currentTrack !== null && source !== null && !!user) {
    const currentQueueItem = {
      uid,
      source,
      user,
      track: currentTrack
    }
    return {
      ...wide,
      currentQueueItem
    }
  }
})

const NowPlaying = g(
  ({
    onClose,
    currentQueueItem,
    playCounter,
    isPlaying,
    isBuffering,
    play,
    pause,
    reset,
    next,
    previous,
    seek,
    repeat,
    share,
    shuffle,
    repost,
    undoRepost,
    clickOverflow,
    goToRoute
  }) => {
    const { uid, track, user } = currentQueueItem
    const { history } = useHistoryContext()

    const { data: currentUserId } = useCurrentUserId()

    const albumInfo = track?.album_backlink

    // Keep a ref for the artwork and dynamically resize the width of the
    // image as the height changes (which is flexed).
    const artworkRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
      if (artworkRef.current) {
        // 4px accounts for the borders on the image
        artworkRef.current.style.width = `${
          artworkRef.current.offsetHeight - 4
        }px`
      }
    }, [artworkRef, playCounter])

    // Store position and duration together so they only trigger one state change
    const [timing, setTiming] = useState({ position: 0, duration: 0 })
    // Additional media key to refresh scrubber in account for out of sync mobile seek position
    // and UI seek position
    const [mediaKey, setMediaKey] = useState(0)
    const seekInterval = useRef<number | undefined>(undefined)
    const [prevPlayCounter, setPrevPlayCounter] = useState<number | null>(null)

    const playbackRate = useSelector(getPlaybackRate)
    const isLongFormContent =
      track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS

    const startSeeking = useCallback(() => {
      clearInterval(seekInterval.current)
      seekInterval.current = window.setInterval(async () => {
        if (!audioPlayer) return
        const position = await audioPlayer.getPosition()
        const duration = await audioPlayer.getDuration()
        setTiming({ position, duration })
      }, SEEK_INTERVAL)
    }, [setTiming])

    // Clean up
    useEffect(() => {
      return () => {
        if (seekInterval.current) clearInterval(seekInterval.current)
      }
    }, [seekInterval])

    // The play counter changes (same song again or new song)
    useEffect(() => {
      if (playCounter !== prevPlayCounter) {
        setPrevPlayCounter(playCounter)
        setTiming({ position: 0, duration: timing.duration })
        setMediaKey((mediaKey) => mediaKey + 1)
        startSeeking()
      }
    }, [
      playCounter,
      prevPlayCounter,
      startSeeking,
      timing,
      setTiming,
      setMediaKey
    ])

    const record = useRecord()

    const {
      title,
      track_id,
      owner_id,
      has_current_user_saved,
      has_current_user_reposted,
      _co_sign
    } = track

    const { name, handle } = user
    const image = useTrackCoverArt({
      trackId: track_id,
      size: SquareSizes.SIZE_480_BY_480
    })

    let playButtonStatus
    if (isBuffering) {
      playButtonStatus = PlayButtonStatus.LOAD
    } else if (isPlaying) {
      playButtonStatus = PlayButtonStatus.PAUSE
    } else {
      playButtonStatus = PlayButtonStatus.PLAY
    }

    const togglePlay = () => {
      if (isPlaying) {
        pause()
        record(
          make(Name.PLAYBACK_PAUSE, {
            id: `${track_id}`,
            source: PlaybackSource.NOW_PLAYING
          })
        )
      } else {
        play()
        record(
          make(Name.PLAYBACK_PLAY, {
            id: `${track_id}`,
            source: PlaybackSource.NOW_PLAYING
          })
        )
      }
    }

    const toggleSaveTrack = useToggleFavoriteTrack({
      trackId: track_id,
      source: FavoriteSource.NOW_PLAYING
    })

    const toggleFavorite = useCallback(() => {
      toggleSaveTrack()
    }, [toggleSaveTrack])

    const toggleRepost = useCallback(() => {
      has_current_user_reposted ? undoRepost(track_id) : repost(track_id)
    }, [track_id, has_current_user_reposted, undoRepost, repost])

    const onShare = useCallback(() => {
      share(track_id)
    }, [share, track_id])

    const goToTrackPage = () => {
      onClose()
      goToRoute(history.location, track.permalink)
    }

    const goToProfilePage = () => {
      onClose()
      goToRoute(history.location, profilePage(handle))
    }

    const onClickOverflow = useCallback(() => {
      const isOwner = currentUserId === owner_id

      const overflowActions = [
        !isOwner
          ? has_current_user_reposted
            ? OverflowAction.UNREPOST
            : OverflowAction.REPOST
          : null,
        !isOwner
          ? has_current_user_saved
            ? OverflowAction.UNFAVORITE
            : OverflowAction.FAVORITE
          : null,
        isOwner ? OverflowAction.ADD_TO_ALBUM : null,
        !track?.is_unlisted || isOwner ? OverflowAction.ADD_TO_PLAYLIST : null,
        OverflowAction.VIEW_TRACK_PAGE,
        albumInfo ? OverflowAction.VIEW_ALBUM_PAGE : null,
        OverflowAction.VIEW_ARTIST_PAGE
      ].filter(Boolean) as OverflowAction[]

      const overflowCallbacks = {
        [OverflowAction.VIEW_TRACK_PAGE]: onClose,
        [OverflowAction.VIEW_ARTIST_PAGE]: onClose
      }

      clickOverflow(track_id, overflowActions, overflowCallbacks)
    }, [
      currentUserId,
      owner_id,
      has_current_user_reposted,
      has_current_user_saved,
      track,
      albumInfo,
      onClose,
      clickOverflow,
      track_id
    ])

    const onPrevious = () => {
      const isLongFormContent =
        track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
      if (isLongFormContent) {
        const position = timing.position
        const newPosition = position - SKIP_DURATION_SEC
        seek(Math.max(0, newPosition))
        // Update mediakey so scrubber updates
        setTiming({ position: newPosition, duration: timing.duration })
        setMediaKey((mediaKey) => mediaKey + 1)
      } else {
        const shouldGoToPrevious = timing.position < RESTART_THRESHOLD_SEC
        if (shouldGoToPrevious) {
          previous()
        } else {
          reset(true /* shouldAutoplay */)
        }
      }
    }

    const onNext = () => {
      const isLongFormContent =
        track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
      if (isLongFormContent) {
        const newPosition = timing.position + SKIP_DURATION_SEC
        seek(Math.min(newPosition, timing.duration))
        // Update mediakey so scrubber updates
        setTiming({ position: newPosition, duration: timing.duration })
        setMediaKey((mediaKey) => mediaKey + 1)
      } else {
        next()
      }
    }

    const dominantColor = useTrackCoverArtDominantColor({
      trackId: track?.track_id
    })

    const artworkAverageColor = {
      boxShadow: `0 1px 15px -5px rgba(
        ${dominantColor?.r},
        ${dominantColor?.g},
        ${dominantColor?.b},
        ${dominantColor ? 0.25 : 0})`,
      transition: 'box-shadow 0.3s ease-in-out'
    }

    const matrix = isMatrix()

    const gatedTrackStatusMap = useSelector(getGatedContentStatusMap)
    const gatedTrackStatus =
      track_id &&
      gatedTrackStatusMap[typeof track_id === 'number' ? track_id : -1]
    const { onOpen: openPremiumContentPurchaseModal } =
      usePremiumContentPurchaseModal()
    const onClickPill = useRequiresAccountOnClick(() => {
      openPremiumContentPurchaseModal(
        {
          contentId: typeof track_id === 'number' ? track_id : -1,
          contentType: PurchaseableContentType.TRACK
        },
        { source: ModalSource.NowPlaying }
      )
    }, [track_id, openPremiumContentPurchaseModal])

    const { hasStreamAccess } = useGatedContentAccess(track)
    const shouldShowPurchasePreview =
      track?.stream_conditions &&
      'usdc_purchase' in track.stream_conditions &&
      !hasStreamAccess

    return (
      <div className={styles.nowPlaying}>
        <div className={styles.header}>
          <div className={styles.caretContainer} onClick={onClose}>
            <IconCaret className={styles.iconCaret} />
          </div>
          <div className={styles.titleContainer}>{messages.nowPlaying}</div>
        </div>
        {_co_sign ? (
          <TrackFlair
            className={styles.artwork}
            size={Size.XLARGE}
            id={track_id}
            forwardRef={artworkRef}
          >
            <div
              className={styles.image}
              onClick={goToTrackPage}
              style={artworkAverageColor}
            >
              <TrackDogEar trackId={track_id} borderOffset={2} />
              <DynamicImage image={image} />
            </div>
          </TrackFlair>
        ) : (
          <div className={styles.artwork}>
            <div
              className={styles.image}
              onClick={goToTrackPage}
              ref={artworkRef}
              style={artworkAverageColor}
            >
              <TrackDogEar trackId={track_id as ID} borderOffset={2} />
              <DynamicImage image={image} />
            </div>
          </div>
        )}
        <div className={styles.info}>
          <div className={styles.trackTitleContainer}>
            <div className={styles.title} onClick={goToTrackPage}>
              {title}
            </div>
            {shouldShowPurchasePreview ? (
              <LockedStatusBadge
                locked
                iconSize='2xs'
                coloredWhenLocked
                variant='premium'
                text={messages.preview}
              />
            ) : null}
          </div>
          <div className={styles.artist} onClick={goToProfilePage}>
            {name}
            <UserBadges
              userId={owner_id}
              size='s'
              className={styles.verified}
            />
          </div>
        </div>
        <div className={styles.timeControls}>
          <Scrubber
            // Include the duration in the media key because the play counter can
            // potentially update before the duration coming from the native layer if present
            mediaKey={`${uid}${mediaKey}${timing.duration}`}
            isPlaying={isPlaying && !isBuffering}
            isDisabled={!uid}
            isMobile
            getAudioPosition={
              audioPlayer ? audioPlayer.getPosition : () => timing.position
            }
            getTotalTime={
              audioPlayer ? audioPlayer.getDuration : () => timing.duration
            }
            elapsedSeconds={timing.position}
            totalSeconds={timing.duration}
            includeTimestamps
            onScrubRelease={seek}
            playbackRate={
              isLongFormContent ? playbackRateValueMap[playbackRate] : 1
            }
            style={{
              railListenedColor: 'var(--track-slider-rail)',
              handleColor: 'var(--track-slider-handle)'
            }}
          />
        </div>
        <div className={styles.controls}>
          <div className={styles.repeatButton}>
            <RepeatButtonProvider
              onRepeatOff={() => repeat(RepeatMode.OFF)}
              onRepeatAll={() => repeat(RepeatMode.ALL)}
              onRepeatSingle={() => repeat(RepeatMode.SINGLE)}
            />
          </div>
          <div className={styles.previousButton}>
            <PreviousButtonProvider isMobile onClick={onPrevious} />
          </div>
          <div className={styles.playButton}>
            <PlayButton
              playable
              status={playButtonStatus}
              onClick={togglePlay}
            />
          </div>
          <div className={styles.nextButton}>
            <NextButtonProvider isMobile onClick={onNext} />
          </div>
          <div className={styles.shuffleButton}>
            <ShuffleButtonProvider
              onShuffleOn={() => shuffle(true)}
              onShuffleOff={() => shuffle(false)}
            />
          </div>
        </div>
        <div className={styles.actions}>
          {shouldShowPurchasePreview && track.stream_conditions ? (
            <GatedConditionsPill
              showIcon={false}
              streamConditions={track.stream_conditions}
              unlocking={gatedTrackStatus === 'UNLOCKING'}
              onClick={onClickPill}
              className={styles.premiumPill}
              buttonSize='large'
              contentId={track_id as ID}
              contentType='track'
            />
          ) : null}
          <ActionsBar
            trackId={track_id}
            onToggleRepost={toggleRepost}
            onToggleFavorite={toggleFavorite}
            onShare={onShare}
            onClickOverflow={onClickOverflow}
            isDarkMode={isDarkMode()}
            isMatrixMode={matrix}
          />
        </div>
      </div>
    )
  }
)

function makeMapStateToProps() {
  const getCurrentQueueItem = makeGetCurrent()

  const mapStateToProps = (state: AppState) => {
    const currentQueueItem = getCurrentQueueItem(state)
    return {
      currentQueueItem,
      seek: getSeek(state),
      playCounter: getCounter(state),
      isPlaying: getPlaying(state),
      isBuffering: getBuffering(state)
    }
  }
  return mapStateToProps
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    play: () => {
      dispatch(play({}))
    },
    pause: () => {
      dispatch(pause({}))
    },
    next: () => {
      dispatch(next({ skip: true }))
    },
    previous: () => {
      dispatch(previous())
    },
    reset: (shouldAutoplay: boolean) => {
      dispatch(reset({ shouldAutoplay }))
    },
    seek: (position: number) => {
      dispatch(seek({ seconds: position }))
    },
    repeat: (mode: RepeatMode) => {
      dispatch(repeat({ mode }))
    },
    shuffle: (enable: boolean) => {
      dispatch(shuffle({ enable }))
    },
    share: (trackId: ID) =>
      dispatch(
        requestOpenShareModal({
          type: 'track',
          trackId,
          source: ShareSource.NOW_PLAYING
        })
      ),
    repost: (trackId: ID) =>
      dispatch(repostTrack(trackId, RepostSource.NOW_PLAYING)),
    undoRepost: (trackId: ID) =>
      dispatch(undoRepostTrack(trackId, RepostSource.NOW_PLAYING)),
    clickOverflow: (
      trackId: ID | string,
      overflowActions: OverflowAction[],
      callbacks: OverflowActionCallbacks
    ) =>
      dispatch(
        open({
          source: OverflowSource.TRACKS,
          id: trackId,
          overflowActions,
          overflowActionCallbacks: callbacks
        })
      ),
    goToRoute: (location: Location, route: string) =>
      dispatch(pushRoute(location, route))
  }
}

export default connect(makeMapStateToProps, mapDispatchToProps)(NowPlaying)
