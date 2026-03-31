import {
  queueSelectors,
  playerSelectors
} from '@audius/common/store'
import { Nullable, route } from '@audius/common/utils'
import { Name, SquareSizes, Track } from '@audius/common/models'
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode
} from 'react'
import { push } from 'utils/navigation'
import { AppState } from 'store/types'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import cn from 'classnames'

import ButterchurnVisualizer from 'utils/visualizer/butterchurnVisualizer'
import Toast from 'components/toast/Toast'

import styles from './VisualizerProvider.module.css'

import { make, TrackEvent } from 'common/store/analytics/actions'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import PlayingTrackInfo from 'components/play-bar/desktop/components/PlayingTrackInfo'
import { webgl2Supported } from './utils'
import {
  IconAudiusLogoHorizontalNew,
  IconClose as IconRemove,
  IconCaretLeft,
  IconCaretRight,
  IconKebabHorizontal,
  Flex,
  Switch,
  Text,
  Popup
} from '@audius/harmony'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { audioPlayer } from 'services/audio-player'
import { useCurrentTrack } from '@audius/common/hooks'
import { useUser } from '@audius/common/api'
import { toggleAutoCycle, toggleAutoHideTrackDetails } from './store/slice'
import {
  getIsVisible,
  getIsAutoCycling,
  getAutoHideTrackDetails
} from './store/selectors'

const { profilePage } = route
const { makeGetCurrent } = queueSelectors
const { getPlaying } = playerSelectors

const messages = {
  browserUnsupported: (browser: string) =>
    `Heads Up! Visualizer is not fully supported in ${browser} 😢 Please switch to a different browser like Chrome to view!`,
  optionsTriggerLabel: 'Open visualizer options',
  optionsHeading: 'Visualizer Options',
  previous: 'Previous visualizer',
  next: 'Next visualizer',
  autoAdvance: 'Auto-advance',
  autoAdvanceHint: 'New visualizer every 45s',
  autoHideTrackDetails: 'Auto-hide Now Playing',
  autoHideTrackDetailsHint: 'Fades when mouse is idle',
  closeVisualizer: 'Close visualizer'
}

/** ms to keep the now-playing corner visible after `currentQueueItem.uid` changes while auto-hide is on */
const TRACK_CHANGE_NOW_PLAYING_MS = 4500

const Artwork = ({ track }: { track?: Track | null }) => {
  const { track_id } = track || {}
  const { imageUrl: image } = useTrackCoverArt({
    trackId: track_id,
    size: SquareSizes.SIZE_480_BY_480
  })
  return <DynamicImage wrapperClassName={styles.artwork} image={image} />
}

const VisualizerAutoCycleSync = connect((state: AppState) => ({
  isVisible: getIsVisible(state),
  isAutoCycling: getIsAutoCycling(state)
}))(function VisualizerAutoCycleSyncInner({
  isVisible,
  isAutoCycling
}: {
  isVisible: boolean
  isAutoCycling: boolean
}) {
  useEffect(() => {
    if (isVisible && isAutoCycling) {
      ButterchurnVisualizer?.startAutoCycle()
    } else {
      ButterchurnVisualizer?.stopAutoCycle()
    }
  }, [isVisible, isAutoCycling])
  return null
})

const VisualizerOptionsForm = connect(
  (state: AppState) => ({
    isAutoCycling: getIsAutoCycling(state),
    autoHideTrackDetails: getAutoHideTrackDetails(state)
  }),
  { toggleAutoCycle, toggleAutoHideTrackDetails }
)(function VisualizerOptionsFormInner({
  isAutoCycling,
  autoHideTrackDetails,
  toggleAutoCycle: onToggleAutoCycle,
  toggleAutoHideTrackDetails: onToggleAutoHideTrackDetails,
  canBack
}: {
  isAutoCycling: boolean
  autoHideTrackDetails: boolean
  toggleAutoCycle: () => void
  toggleAutoHideTrackDetails: () => void
  canBack: boolean
}) {
  return (
    <Flex column gap='m' className={styles.optionsPanel}>
      <Flex
        alignItems='center'
        justifyContent='space-between'
        gap='m'
        className={styles.panelHeader}
      >
        <Text
          variant='title'
          size='s'
          strength='strong'
          color='staticWhite'
          className={styles.panelTitle}
        >
          {messages.optionsHeading}
        </Text>
      </Flex>
      <div
        className={styles.optionsNavRail}
        role='group'
        aria-label={messages.optionsHeading}
      >
        <button
          type='button'
          className={styles.optionsNavCell}
          aria-label={messages.previous}
          disabled={!canBack}
          onClick={() => ButterchurnVisualizer?.historyBack()}
        >
          <IconCaretLeft className={styles.navIcon} aria-hidden />
        </button>
        <div className={styles.optionsNavDivider} aria-hidden />
        <button
          type='button'
          className={styles.optionsNavCell}
          aria-label={messages.next}
          onClick={() => ButterchurnVisualizer?.historyForwardOrNext()}
        >
          <IconCaretRight className={styles.navIcon} aria-hidden />
        </button>
      </div>
      <div className={styles.autoAdvanceBlock}>
        <Flex column gap='xs'>
          <Text
            variant='body'
            size='s'
            strength='strong'
            color='staticWhite'
          >
            {messages.autoAdvance}
          </Text>
          <Text
            variant='body'
            size='xs'
            strength='default'
            color='staticWhite'
            className={styles.autoAdvanceHint}
          >
            {messages.autoAdvanceHint}
          </Text>
        </Flex>
        <div className={styles.autoSwitch}>
          <Switch
            checked={isAutoCycling}
            onChange={() => {
              onToggleAutoCycle()
            }}
            aria-label={messages.autoAdvance}
          />
        </div>
      </div>
      <div className={styles.autoAdvanceBlock}>
        <Flex column gap='xs'>
          <Text
            variant='body'
            size='s'
            strength='strong'
            color='staticWhite'
          >
            {messages.autoHideTrackDetails}
          </Text>
          <Text
            variant='body'
            size='xs'
            strength='default'
            color='staticWhite'
            className={styles.autoAdvanceHint}
          >
            {messages.autoHideTrackDetailsHint}
          </Text>
        </Flex>
        <div className={styles.autoSwitch}>
          <Switch
            checked={autoHideTrackDetails}
            onChange={() => {
              onToggleAutoHideTrackDetails()
            }}
            aria-label={messages.autoHideTrackDetails}
          />
        </div>
      </div>
    </Flex>
  )
})

const VisualizerTrackCorner = connect(
  (state: AppState) => ({
    autoHideTrackDetails: getAutoHideTrackDetails(state)
  })
)(function VisualizerTrackCornerInner({
  showControls,
  nowPlayingPeek,
  autoHideTrackDetails,
  children
}: {
  showControls: boolean
  nowPlayingPeek: boolean
  autoHideTrackDetails: boolean
  children: ReactNode
}) {
  const clusterVisible =
    !autoHideTrackDetails || showControls || nowPlayingPeek
  return (
    <div
      className={cn(styles.trackCornerCluster, {
        [styles.trackCornerClusterVisible]: clusterVisible
      })}
    >
      {children}
    </div>
  )
})

type VisualizerProps = {
  isVisible: boolean
  onClose: () => void
} & ReturnType<typeof mapDispatchToProps> &
  ReturnType<ReturnType<typeof makeMapStateToProps>>

const webGL2Exists = webgl2Supported()

const Visualizer = ({
  isVisible,
  currentQueueItem,
  playing,
  autoHideTrackDetails,
  onClose,
  recordOpen,
  recordClose,
  goToRoute
}: VisualizerProps) => {
  const [toastText, setToastText] = useState('')
  const [fadeVisualizer, setFadeVisualizer] = useState<Nullable<Boolean>>(null)
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [nowPlayingPeek, setNowPlayingPeek] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [, setHistoryTick] = useState(0)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trackFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevQueueUidRef = useRef<string | null>(null)

  const optionsAnchorRef = useRef<HTMLButtonElement>(null)

  const optionsOpenRef = useRef(optionsOpen)
  useEffect(() => {
    optionsOpenRef.current = optionsOpen
  }, [optionsOpen])

  const revealChromeForMs = useCallback((ms: number) => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (!optionsOpenRef.current) {
        setShowControls(false)
      }
    }, ms)
  }, [])

  const handleMouseMove = useCallback(() => {
    revealChromeForMs(3000)
  }, [revealChromeForMs])

  useEffect(() => {
    if (!isVisible || !showVisualizer) return
    const onMove = () => handleMouseMove()
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [isVisible, showVisualizer, handleMouseMove])

  useEffect(() => {
    if (!isVisible || !showVisualizer) return
    handleMouseMove()
  }, [isVisible, showVisualizer, handleMouseMove])

  useEffect(() => {
    if (!optionsOpen && showControls) {
      handleMouseMove()
    }
  }, [optionsOpen, showControls, handleMouseMove])

  useEffect(() => {
    if (!showControls) {
      setOptionsOpen(false)
    }
  }, [showControls])

  useEffect(() => {
    if (!isVisible) {
      prevQueueUidRef.current = null
      setNowPlayingPeek(false)
      if (trackFlashTimerRef.current) {
        clearTimeout(trackFlashTimerRef.current)
        trackFlashTimerRef.current = null
      }
    }
  }, [isVisible])

  const currentTrack = useCurrentTrack()

  useEffect(() => {
    if (!isVisible || !showVisualizer || !autoHideTrackDetails) return
    const uid = currentQueueItem?.uid
    if (!uid) return
    if (prevQueueUidRef.current === uid) return
    prevQueueUidRef.current = uid

    setNowPlayingPeek(true)
    if (trackFlashTimerRef.current) clearTimeout(trackFlashTimerRef.current)
    trackFlashTimerRef.current = setTimeout(() => {
      setNowPlayingPeek(false)
      trackFlashTimerRef.current = null
    }, TRACK_CHANGE_NOW_PLAYING_MS)
  }, [
    isVisible,
    showVisualizer,
    autoHideTrackDetails,
    currentQueueItem?.uid
  ])

  useEffect(() => {
    return () => {
      if (trackFlashTimerRef.current) {
        clearTimeout(trackFlashTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    ButterchurnVisualizer?.setOnHistoryChange?.(() =>
      setHistoryTick((t) => t + 1)
    )
    return () => ButterchurnVisualizer?.setOnHistoryChange?.(null)
  }, [])

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [])

  const canBack = ButterchurnVisualizer?.canHistoryBack() ?? false

  const chromeIdleHidden = !showControls && !optionsOpen

  const { data: user } = useUser(currentTrack?.owner_id)

  useEffect(() => {
    if (showVisualizer) {
      let browser: string | undefined
      if (!webGL2Exists) {
        browser = 'your browser'
      } else if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
        browser = 'Safari'
      } else if (/MSIE/i.test(navigator.userAgent)) {
        browser = 'Internet Explorer'
      } else if (!window?.AudioContext) {
        browser = 'your browser'
      }
      if (browser) {
        setToastText(messages.browserUnsupported(browser))
      }
    }
  }, [showVisualizer])

  const audioBindKey = `${audioPlayer?.audio?.currentSrc ?? ''}|${Boolean(audioPlayer?.audioCtx)}`

  useEffect(() => {
    if (!isVisible || !audioPlayer || !playing) return
    const player = audioPlayer

    if (player.audioCtx) {
      ButterchurnVisualizer?.bind(player)
    } else {
      const onCanPlay = () => ButterchurnVisualizer?.bind(player)
      player.audio.addEventListener('canplay', onCanPlay)
      return () => player.audio.removeEventListener('canplay', onCanPlay)
    }
  }, [isVisible, playing, audioBindKey])

  useEffect(() => {
    if (isVisible) {
      ButterchurnVisualizer?.show()
      recordOpen()
      setShowVisualizer(true)
      setTimeout(() => {
        setFadeVisualizer(true)
      }, 50)
    } else {
      setFadeVisualizer(false)
    }
  }, [isVisible])

  useEffect(() => {
    if (fadeVisualizer === false) {
      const timer = setTimeout(() => {
        setShowVisualizer(false)
        ButterchurnVisualizer?.hide()
        recordClose()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [fadeVisualizer])

  const goToTrackPage = useCallback(() => {
    if (currentTrack && user) {
      goToRoute(currentTrack.permalink)
    }
  }, [currentTrack, user])

  const goToArtistPage = useCallback(() => {
    if (user) {
      goToRoute(profilePage(user.handle))
    }
  }, [user])

  const renderTrackInfo = () => {
    const { uid } = currentQueueItem
    return currentTrack && user && uid ? (
      <div className={styles.trackInfoWrapper}>
        <PlayingTrackInfo
          trackId={currentTrack.track_id}
          isOwner={currentTrack.owner_id === user.user_id}
          trackTitle={currentTrack.title}
          trackPermalink={currentTrack.permalink}
          artistName={user.name}
          artistHandle={user.handle}
          artistUserId={user.user_id}
          isVerified={user.is_verified}
          isTrackUnlisted={currentTrack.is_unlisted}
          isStreamGated={currentTrack.is_stream_gated}
          onClickTrackTitle={() => {
            goToTrackPage()
            onClose()
          }}
          onClickArtistName={() => {
            goToArtistPage()
            onClose()
          }}
          hasShadow={true}
          fullTrackText
        />
      </div>
    ) : (
      <div className={styles.emptyTrackInfoWrapper}></div>
    )
  }

  return (
    <div
      className={cn(styles.visualizer, {
        [styles.fade]: fadeVisualizer,
        [styles.show]: showVisualizer,
        [styles.visualizerCursorHidden]: chromeIdleHidden
      })}
      onMouseMove={handleMouseMove}
    >
      <VisualizerAutoCycleSync />
      <div className='visualizer' />
      <div className={styles.logoWrapper}>
        <div className={styles.logoMark}>
          <IconAudiusLogoHorizontalNew
            width={140}
            sizeH='l'
            css={{
              display: 'block',
              color: '#ffffff',
              fill: '#ffffff'
            }}
          />
        </div>
      </div>
      <div
        className={cn(styles.topControlsWrap, {
          [styles.topControlsWrapVisible]: showControls
        })}
      >
        <button
          type='button'
          className={styles.pillButton}
          onClick={onClose}
          aria-label={messages.closeVisualizer}
        >
          <IconRemove className={styles.pillIcon} aria-hidden />
        </button>
        <div className={styles.pillDivider} role='presentation' />
        <button
          type='button'
          ref={optionsAnchorRef}
          className={styles.pillButton}
          onClick={() => setOptionsOpen(!optionsOpen)}
          aria-label={messages.optionsTriggerLabel}
          aria-expanded={optionsOpen}
          aria-haspopup='dialog'
        >
          <IconKebabHorizontal className={styles.pillIcon} aria-hidden />
        </button>
      </div>
      <Popup
        isVisible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        anchorRef={optionsAnchorRef}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        className={styles.optionsPopup}
        zIndex={20}
      >
        <VisualizerOptionsForm canBack={canBack} />
      </Popup>
      <VisualizerTrackCorner
        showControls={showControls}
        nowPlayingPeek={nowPlayingPeek}
      >
        <div className={styles.infoOverlayTileShadow}></div>
        <div className={styles.infoOverlayTile}>
          <div
            className={cn(styles.artworkWrapper, {
              [styles.playing]: currentTrack
            })}
            onClick={() => {
              goToTrackPage()
              onClose()
            }}
          >
            <Artwork track={currentTrack} />
          </div>
          {!autoHideTrackDetails || showControls || nowPlayingPeek
            ? renderTrackInfo()
            : null}
        </div>
      </VisualizerTrackCorner>
      <Toast
        open={isVisible && !!toastText}
        text={toastText || ''}
        className={styles.visualizerDisabled}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
      />
    </div>
  )
}

const makeMapStateToProps = () => {
  const getCurrentQueueItem = makeGetCurrent()
  const mapStateToProps = (state: AppState) => {
    const currentQueueItem = getCurrentQueueItem(state)
    return {
      currentQueueItem,
      playing: getPlaying(state),
      autoHideTrackDetails: getAutoHideTrackDetails(state)
    }
  }
  return mapStateToProps
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  recordOpen: () => {
    const trackEvent: TrackEvent = make(Name.VISUALIZER_OPEN, {})
    dispatch(trackEvent)
  },
  recordClose: () => {
    const trackEvent: TrackEvent = make(Name.VISUALIZER_CLOSE, {})
    dispatch(trackEvent)
  },
  goToRoute: (route: string) => dispatch(push(route))
})

export default connect(makeMapStateToProps, mapDispatchToProps)(Visualizer)
