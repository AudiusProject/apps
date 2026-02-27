import { useState, useEffect, useCallback, useRef } from 'react'

import cn from 'classnames'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'

import { useIsMobile } from 'hooks/useIsMobile'
import { applyThemeToLottie } from 'utils/lottieTheme'
import { useLottieThemeColors } from 'utils/theme/theme'

import styles from '../PlayBarButton.module.css'

enum ShuffleStates {
  OFF = 0,
  ANIMATE_OFF_ON = 1,
  ON = 2,
  ANIMATE_ON_OFF = 3
}

const STATES_LENGTH = 4

const SHUFFLE_STATE_LS_KEY = 'shuffleState'
const getShuffleState = (defaultState: ShuffleStates) => {
  const localStorageShuffleState =
    window.localStorage.getItem(SHUFFLE_STATE_LS_KEY)
  if (localStorageShuffleState === null) {
    window.localStorage.setItem(SHUFFLE_STATE_LS_KEY, defaultState.toString())
    return defaultState
  } else {
    return parseInt(localStorageShuffleState)
  }
}

type AnimationStates = {
  pbIconShuffleOff: object
  pbIconShuffleOn: object
}

type ShuffleButtonProps = {
  onShuffleOn: () => void
  onShuffleOff: () => void
}

const ShuffleButton = ({
  onShuffleOn = () => {},
  onShuffleOff = () => {}
}: ShuffleButtonProps) => {
  const themeColors = useLottieThemeColors()
  const isMobile = useIsMobile()
  const [animations, setAnimations] = useState<AnimationStates | null>(null)
  const baseAnimations = useRef<AnimationStates | null>(null)

  const [state, setState] = useState({
    shuffleState: getShuffleState(ShuffleStates.OFF),
    isPaused: true,
    icon: null as object | null
  })

  useEffect(() => {
    const loadAnimations = async () => {
      if (!baseAnimations.current) {
        const { default: pbIconShuffleOff } = (await import(
          '../../../assets/animations/pbIconShuffleOff.json'
        )) as { default: object }
        const { default: pbIconShuffleOn } = (await import(
          '../../../assets/animations/pbIconShuffleOn.json'
        )) as { default: object }
        baseAnimations.current = {
          pbIconShuffleOff,
          pbIconShuffleOn
        }
      }
      setAnimations({
        pbIconShuffleOff: applyThemeToLottie(
          baseAnimations.current.pbIconShuffleOff,
          themeColors,
          'primary'
        ),
        pbIconShuffleOn: applyThemeToLottie(
          baseAnimations.current.pbIconShuffleOn,
          themeColors,
          'neutral'
        )
      })
    }
    loadAnimations()
  }, [themeColors])

  const handleChange = useCallback(
    (shuffleState: ShuffleStates) => {
      if (!animations) return
      const { pbIconShuffleOff, pbIconShuffleOn } = animations
      let icon: object
      let isPaused: boolean
      switch (shuffleState) {
        case ShuffleStates.OFF:
          onShuffleOff()
          icon = pbIconShuffleOn
          isPaused = true
          break
        case ShuffleStates.ANIMATE_OFF_ON:
          icon = pbIconShuffleOn
          isPaused = false
          break
        case ShuffleStates.ON:
          onShuffleOn()
          icon = pbIconShuffleOff
          isPaused = true
          break
        case ShuffleStates.ANIMATE_ON_OFF:
          icon = pbIconShuffleOff
          isPaused = false
          break
        default:
          icon = pbIconShuffleOn
          isPaused = true
      }
      window.localStorage.setItem(SHUFFLE_STATE_LS_KEY, shuffleState.toString())
      setState({
        icon,
        isPaused,
        shuffleState
      })
    },
    [animations, onShuffleOn, onShuffleOff]
  )

  useEffect(() => {
    handleChange(state.shuffleState)
  }, [handleChange, state.shuffleState])

  useEffect(() => {
    if (animations) {
      handleChange(state.shuffleState)
    }
  }, [animations, handleChange, state.shuffleState])

  const nextState = () => {
    const shuffleState = (state.shuffleState + 1) % STATES_LENGTH
    handleChange(shuffleState)
  }

  const lottieRef = useRef<LottieRefCurrentProps>(null)
  useEffect(() => {
    if (lottieRef.current) {
      if (state.isPaused) {
        lottieRef.current.pause()
      } else {
        lottieRef.current.play()
      }
    }
  }, [lottieRef, state.isPaused])

  if (!animations || !state.icon) return null

  return (
    <button
      className={cn(styles.button, {
        [styles.buttonFixedSize]: isMobile,
        [styles.shuffle]: isMobile
      })}
      onClick={nextState}
    >
      <Lottie
        lottieRef={lottieRef}
        loop={false}
        autoplay={false}
        animationData={state.icon}
        onComplete={nextState}
      />
    </button>
  )
}

export default ShuffleButton
