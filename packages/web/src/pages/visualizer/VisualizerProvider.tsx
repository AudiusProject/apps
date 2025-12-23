import {
  queueSelectors,
  themeSelectors,
  playerSelectors
} from '@audius/common/store'
import { Nullable, route } from '@audius/common/utils'
import { Name, SquareSizes, Track } from '@audius/common/models'
import { useEffect, useState, useCallback } from 'react'
import { push } from 'utils/navigation'
import { AppState } from 'store/types'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import cn from 'classnames'

import Visualizer1 from 'utils/visualizer/visualizer-1.js'
import Toast from 'components/toast/Toast'

import styles from './VisualizerProvider.module.css'

import { shouldShowDark } from 'utils/theme/theme'
import { make, TrackEvent } from 'common/store/analytics/actions'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import PlayingTrackInfo from 'components/play-bar/desktop/components/PlayingTrackInfo'
import { webglSupported } from './utils'
import {
  IconAudiusLogoHorizontal,
  useTheme,
  IconClose as IconRemove
} from '@audius/harmony'
import {
  useTrackCoverArt,
  useTrackCoverArtDominantColors
} from 'hooks/useTrackCoverArt'
import { audioPlayer } from 'services/audio-player'
import { useCurrentTrack } from '@audius/common/hooks'
import { useUser } from '@audius/common/api'

const { profilePage } = route
const { makeGetCurrent } = queueSelectors
const { getPlaying } = playerSelectors
const { getTheme } = themeSelectors

const Artwork = ({ track }: { track?: Track | null }) => {
  const { track_id } = track || {}
  const image = useTrackCoverArt({
    trackId: track_id,
    size: SquareSizes.SIZE_480_BY_480
  })
  return <DynamicImage wrapperClassName={styles.artwork} image={image} />
}

type VisualizerProps = {
  isVisible: boolean
  onClose: () => void
} & ReturnType<typeof mapDispatchToProps> &
  ReturnType<ReturnType<typeof makeMapStateToProps>>

const webGLExists = webglSupported()
const messages = (browser: string) => ({
  notSupported: `Heads Up! Visualizer is not fully supported in ${browser} 😢 Please switch to a different browser like Chrome to view!`
})

const Visualizer = ({
  isVisible,
  currentQueueItem,
  playing,
  theme,
  onClose,
  recordOpen,
  recordClose,
  goToRoute
}: VisualizerProps) => {
  const [toastText, setToastText] = useState('')
  const { spacing } = useTheme()
  // Used to fadeIn/Out the visualizer (opacity 0 -> 1) through a css class
  const [fadeVisualizer, setFadeVisualizer] = useState<Nullable<Boolean>>(null)
  // Used to show/hide the visualizer (display: block/none) through a css class
  const [showVisualizer, setShowVisualizer] = useState(false)

  const currentTrack = useCurrentTrack()
  const { data: user } = useUser(currentTrack?.owner_id)

  useEffect(() => {
    if (showVisualizer) {
      let browser
      if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
        browser = 'Safari'
      } else if (/MSIE/i.test(navigator.userAgent)) {
        browser = 'Internet Explorer'
      } else if (!window?.AudioContext) {
        browser = 'your browser'
      }
      if (browser) {
        setToastText(messages(browser).notSupported)
      }
    }
  }, [showVisualizer])

  // Update Colors
  const dominantColors = useTrackCoverArtDominantColors({
    trackId: currentTrack?.track_id
  })
  useEffect(() => {
    if (dominantColors !== null) {
      Visualizer1?.setDominantColors(dominantColors)
    }
  }, [isVisible, dominantColors, playing])

  // Rebind audio
  useEffect(() => {
    if (!audioPlayer) {
      return
    }
    if (playing) {
      if (audioPlayer.audioCtx) {
        Visualizer1?.bind(audioPlayer)
      } else {
        audioPlayer.audio.addEventListener('canplay', () => {
          Visualizer1?.bind(audioPlayer)
        })
      }
    }
  }, [isVisible, playing])

  useEffect(() => {
    if (isVisible) {
      const darkMode = shouldShowDark(theme)
      Visualizer1?.show(darkMode)
      recordOpen()
      setShowVisualizer(true)
      // Fade in after a 50ms delay because setting showVisualizer() and fadeVisualizer() at the
      // same time leads to a race condition resulting in the animation not fading in sometimes
      setTimeout(() => {
        setFadeVisualizer(true)
      }, 50)
    } else {
      setFadeVisualizer(false)
    }
  }, [isVisible, theme])

  // On Closing of visualizer -> fadeOut
  // Wait some time before removing the wrapper DOM element to allow time for fading out animation.
  useEffect(() => {
    if (fadeVisualizer === false) {
      setTimeout(() => {
        setShowVisualizer(false)
        Visualizer1?.hide()
        recordClose()
      }, 400)
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
    const dominantColor = dominantColors
      ? dominantColors[0]
      : { r: 0, g: 0, b: 0 }
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
          dominantColor={dominantColor}
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
        [styles.show]: showVisualizer
      })}
    >
      <div className='visualizer' />
      <div className={styles.logoWrapper}>
        <IconAudiusLogoHorizontal
          width='auto'
          sizeH='l'
          color='default'
          css={{
            display: 'block',
            marginTop: spacing.l,
            marginBottom: spacing.l,
            opacity: 0.4
          }}
        />
      </div>
      <IconRemove
        color='white'
        className={styles.closeButtonIcon}
        onClick={onClose}
      />
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
        {renderTrackInfo()}
      </div>
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
      theme: getTheme(state)
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
