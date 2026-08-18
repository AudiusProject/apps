import { useState, useEffect, useRef, useCallback } from 'react'

import cn from 'classnames'
import type { LottieRefCurrentProps } from 'lottie-react'

import pbIconPause from 'assets/animations/pbIconPause.json'
import pbIconPlay from 'assets/animations/pbIconPlay.json'
import pbLoadingSpinner from 'assets/animations/pbLoadingSpinner.json'
import { LazyLottie as Lottie } from 'components/lottie/LazyLottie'

import styles from './PlayBarButton.module.css'

enum PlayStates {
  PAUSE = 0,
  ANIMATE_PAUSE_PLAY = 1,
  PLAY = 2,
  ANIMATE_PLAY_PAUSE = 3
}

type PlayButtonProps = {
  playable: boolean
  status: 'play' | 'pause' | 'load'
  onClick: () => void
}

const PlayButton = ({
  playable = true,
  status = 'play',
  onClick = () => {}
}: PlayButtonProps) => {
  const [playState, setPlayState] = useState(PlayStates.PLAY)
  const [isPaused, setIsPaused] = useState(true)
  const [icon, setIcon] = useState(pbIconPlay)
  const prevStatus = useRef(status)

  useEffect(() => {
    if (status === 'pause') {
      setIcon(pbIconPause)
      setPlayState(PlayStates.PAUSE)
    }
  }, [status])

  useEffect(() => {
    let newIcon, newIsPaused, newPlayState

    if (status === 'play' && playState !== PlayStates.PLAY) {
      if (prevStatus.current === 'load') {
        newIcon = pbIconPlay
        newIsPaused = true
        newPlayState = PlayStates.PLAY
      } else {
        newIcon = pbIconPause
        newIsPaused = false
        newPlayState = PlayStates.ANIMATE_PAUSE_PLAY
      }
    }
    if (status === 'pause' && playState !== PlayStates.PAUSE) {
      if (prevStatus.current === 'load') {
        newIcon = pbIconPause
        newIsPaused = true
        newPlayState = PlayStates.PAUSE
      } else {
        newIcon = pbIconPlay
        newIsPaused = false
        newPlayState = PlayStates.ANIMATE_PLAY_PAUSE
      }
    }

    if (newIcon) setIcon(newIcon)
    if (newIsPaused !== undefined) setIsPaused(newIsPaused)
    if (newPlayState !== undefined) setPlayState(newPlayState)
    prevStatus.current = status
  }, [status, playState])

  const handleChange = useCallback(() => {
    let newIcon, newIsPaused
    const newPlayState = (playState + 1) % (Object.keys(PlayStates).length / 2)

    switch (newPlayState) {
      case PlayStates.PLAY:
        newIcon = pbIconPlay
        newIsPaused = true
        break
      case PlayStates.ANIMATE_PLAY_PAUSE:
        newIcon = pbIconPlay
        newIsPaused = false
        break
      case PlayStates.PAUSE:
        newIcon = pbIconPause
        newIsPaused = true
        break
      case PlayStates.ANIMATE_PAUSE_PLAY:
        newIcon = pbIconPause
        newIsPaused = false
        break
      default:
        newIcon = pbIconPlay
        newIsPaused = true
    }

    setIcon(newIcon)
    setIsPaused(newIsPaused)
    setPlayState(newPlayState)
  }, [playState, setIcon, setIsPaused, setPlayState])

  const handleClick = useCallback(() => {
    if (playable) {
      handleChange()
      onClick()
    }
  }, [playable, handleChange, onClick])

  const isLoading = status === 'load'
  let data: object
  let currentIsPaused: boolean
  let loop = false
  if (isLoading) {
    data = pbLoadingSpinner
    currentIsPaused = false
    loop = true
  } else {
    data = icon
    currentIsPaused = isPaused
  }

  const lottieRef = useRef<LottieRefCurrentProps>(null)
  useEffect(() => {
    if (lottieRef.current) {
      if (currentIsPaused) {
        lottieRef.current.pause()
      } else {
        lottieRef.current.play()
      }
    }
  }, [lottieRef, currentIsPaused, playState])

  const ariaLabel = isLoading
    ? 'track loading'
    : playState === PlayStates.PLAY
      ? 'play track'
      : 'pause track'

  return (
    <button
      aria-label={ariaLabel}
      className={cn(styles.button, styles.playButton)}
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
    >
      <div className={styles.animation}>
        <Lottie
          lottieRef={lottieRef}
          loop={loop}
          autoplay={false}
          animationData={data}
          onComplete={handleChange}
        />
      </div>
    </button>
  )
}

export default PlayButton
