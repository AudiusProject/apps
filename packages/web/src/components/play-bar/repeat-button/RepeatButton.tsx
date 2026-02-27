import { useState, useEffect, useCallback, useRef } from 'react'

import cn from 'classnames'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'

import { useIsMobile } from 'hooks/useIsMobile'
import { applyThemeToLottie } from 'utils/lottieTheme'
import { useLottieThemeColors } from 'utils/theme/theme'

import styles from '../PlayBarButton.module.css'

enum RepeatStates {
  OFF = 0,
  ANIMATE_OFF_ALL = 1,
  ALL = 2,
  ANIMATE_ALL_SINGLE = 3,
  SINGLE = 4,
  ANIMATE_SINGLE_OFF = 5
}

const STATES_LENGTH = 6

const REPEAT_STATE_LS_KEY = 'repeatState'
const getRepeatState = (defaultState: RepeatStates) => {
  const localStorageRepeatState =
    window.localStorage.getItem(REPEAT_STATE_LS_KEY)
  if (localStorageRepeatState === null) {
    window.localStorage.setItem(REPEAT_STATE_LS_KEY, defaultState.toString())
    return defaultState
  } else {
    return parseInt(localStorageRepeatState)
  }
}

type AnimationStates = {
  pbIconRepeatAll: object
  pbIconRepeatSingle: object
  pbIconRepeatOff: object
}

type RepeatButtonProps = {
  onRepeatOff: () => void
  onRepeatAll: () => void
  onRepeatSingle: () => void
}

const RepeatButton = ({
  onRepeatOff = () => {},
  onRepeatAll = () => {},
  onRepeatSingle = () => {}
}: RepeatButtonProps) => {
  const themeColors = useLottieThemeColors()
  const isMobile = useIsMobile()
  const [animations, setAnimations] = useState<AnimationStates | null>(null)
  const baseAnimations = useRef<AnimationStates | null>(null)

  const [state, setState] = useState({
    repeatState: getRepeatState(RepeatStates.OFF),
    isPaused: true,
    icon: null as object | null
  })

  useEffect(() => {
    const loadAnimations = async () => {
      if (!baseAnimations.current) {
        const { default: pbIconRepeatAll } = (await import(
          '../../../assets/animations/pbIconRepeatAll.json'
        )) as { default: object }
        const { default: pbIconRepeatSingle } = (await import(
          '../../../assets/animations/pbIconRepeatSingle.json'
        )) as { default: object }
        const { default: pbIconRepeatOff } = (await import(
          '../../../assets/animations/pbIconRepeatOff.json'
        )) as { default: object }
        baseAnimations.current = {
          pbIconRepeatAll,
          pbIconRepeatSingle,
          pbIconRepeatOff
        }
      }
      setAnimations({
        pbIconRepeatAll: applyThemeToLottie(
          baseAnimations.current.pbIconRepeatAll,
          themeColors,
          'neutral'
        ),
        pbIconRepeatSingle: applyThemeToLottie(
          baseAnimations.current.pbIconRepeatSingle,
          themeColors,
          'primary'
        ),
        pbIconRepeatOff: applyThemeToLottie(
          baseAnimations.current.pbIconRepeatOff,
          themeColors,
          'primary'
        )
      })
    }
    loadAnimations()
  }, [themeColors])

  const handleChange = useCallback(
    (repeatState: RepeatStates) => {
      if (!animations) return
      const { pbIconRepeatAll, pbIconRepeatSingle, pbIconRepeatOff } =
        animations
      let icon: object
      let isPaused: boolean
      switch (repeatState) {
        case RepeatStates.OFF:
          onRepeatOff()
          icon = pbIconRepeatAll
          isPaused = true
          break
        case RepeatStates.ANIMATE_OFF_ALL:
          icon = pbIconRepeatAll
          isPaused = false
          break
        case RepeatStates.ALL:
          onRepeatAll()
          icon = pbIconRepeatSingle
          isPaused = true
          break
        case RepeatStates.ANIMATE_ALL_SINGLE:
          icon = pbIconRepeatSingle
          isPaused = false
          break
        case RepeatStates.SINGLE:
          onRepeatSingle()
          icon = pbIconRepeatOff
          isPaused = true
          break
        case RepeatStates.ANIMATE_SINGLE_OFF:
          icon = pbIconRepeatOff
          isPaused = false
          break
        default:
          icon = pbIconRepeatAll
          isPaused = true
      }
      window.localStorage.setItem(REPEAT_STATE_LS_KEY, repeatState.toString())
      setState({
        icon,
        isPaused,
        repeatState
      })
    },
    [animations, onRepeatOff, onRepeatAll, onRepeatSingle]
  )

  useEffect(() => {
    handleChange(state.repeatState)
  }, [handleChange, state.repeatState])

  useEffect(() => {
    if (animations) {
      handleChange(state.repeatState)
    }
  }, [animations, handleChange, state.repeatState])

  const nextState = () => {
    const repeatState = (state.repeatState + 1) % STATES_LENGTH
    handleChange(repeatState)
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
        [styles.repeat]: isMobile
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

export default RepeatButton
