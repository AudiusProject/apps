import { useCallback, useEffect, useRef, useState } from 'react'

import { instanceOfPurchaseGate } from '@audius/sdk'
import cn from 'classnames'

import AudiusLogoGlyph from '../../assets/img/audiusLogoGlyph.svg'
import { getCopyableLink } from '../../util/shareUtil'
import PlayButton, { PlayingState } from '../playbutton/PlayButton'
import { Preview } from '../preview/Preview'
import BedtimeScrubber from '../scrubber/BedtimeScrubber'

import styles from './TrackPlayerTiny.module.css'

const MARQUEE_SPACING = 40
const SHOULD_ANIMATE_WIDTH_THRESHOLD = 15

const TrackPlayerTiny = ({
  title,
  mediaKey,
  artistName,
  trackURL,
  playingState,
  position,
  duration,
  seekTo,
  onTogglePlay,
  streamConditions,
  audioPlayer
}) => {
  const info = `${title} • ${artistName}`

  const onClick = useCallback(() => {
    window.open(getCopyableLink(trackURL), '_blank')
  }, [trackURL])

  const infoRef = useRef(null)
  const containerRef = useRef(null)

  // Whether not the marquee animation should run
  const [animating, setAnimating] = useState(false)

  // How wide the info section is (computed from rendered text box size)
  const [infoWidth, setInfoWidth] = useState(null)

  // On first mount, record the computed width of the info section (title + artist)
  useEffect(() => {
    if (infoRef.current) {
      const computedInfoWidth = infoRef.current.getBoundingClientRect().width
      setInfoWidth(computedInfoWidth)
    }
  }, [infoRef, containerRef, setInfoWidth])

  // When playing and the info text is larger than the container, start the
  // marquee animation
  useEffect(() => {
    if (playingState === PlayingState.Playing) {
      if (infoRef.current && containerRef.current) {
        const computedContainerWidth =
          containerRef.current.getBoundingClientRect().width
        const computedInfoWidth = infoRef.current.getBoundingClientRect().width
        if (
          computedInfoWidth >
          computedContainerWidth - SHOULD_ANIMATE_WIDTH_THRESHOLD
        ) {
          setAnimating(true)
        }
      }
    } else {
      setAnimating(false)
    }
  }, [containerRef, animating, setAnimating, playingState])

  const infoStyle = {}
  if (infoWidth) {
    infoStyle['--info-width'] = `${infoWidth + MARQUEE_SPACING}px`
  }

  const isGated = !!streamConditions
  const isPurchaseable =
    streamConditions && instanceOfPurchaseGate(streamConditions)

  return (
    <div className={styles.wrapper}>
      <PlayButton
        playingState={playingState}
        onTogglePlay={onTogglePlay}
        className={styles.playButton}
        isPlayable={!isGated || isPurchaseable}
        iconSize='2xs'
      />
      <div className={styles.container} onClick={onClick} ref={containerRef}>
        {isPurchaseable ? <Preview size='s' /> : null}
        <div className={styles.playContainer} />
        <div className={styles.infoContainer}>
          <h1
            className={cn(styles.info, {
              [styles.animating]: animating
            })}
            ref={infoRef}
            style={infoStyle}
          >
            {info}
          </h1>
        </div>
        <div className={styles.logoContainer}>
          <AudiusLogoGlyph className={styles.logo} />
        </div>
      </div>
      <div className={styles.scrubber}>
        <BedtimeScrubber
          mediaKey={`title-${mediaKey}`}
          playingState={playingState}
          seekTo={seekTo}
          handleColor='rgba(0,0,0,0)'
          handleShadow='var(--accent-red)'
          duration={duration}
          elapsedSeconds={position}
          includeExpandedTargets={false}
          railListenedColor={'var(--primary)'}
          railUnlistenedColor={'var(--neutral-light-8)'}
          railHoverColor={'var(--primary)'}
          audioPlayer={audioPlayer}
        />
      </div>
    </div>
  )
}

export default TrackPlayerTiny
