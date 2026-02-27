import { useState, useEffect, useRef } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'
import { applyThemeToLottie } from 'utils/lottieTheme'
import { useLottieThemeColors } from 'utils/theme/theme'

import RepeatButton from './RepeatButton'

type RepeatButtonProviderProps = {
  onRepeatOff: () => void
  onRepeatSingle: () => void
  onRepeatAll: () => void
}

type AnimationStates = {
  pbIconRepeatAll: object
  pbIconRepeatSingle: object
  pbIconRepeatOff: object
}

const RepeatButtonProvider = ({
  onRepeatOff,
  onRepeatSingle,
  onRepeatAll
}: RepeatButtonProviderProps) => {
  const themeColors = useLottieThemeColors()
  const isMobile = useIsMobile()
  const [animations, setAnimations] = useState<AnimationStates | null>(null)
  const baseAnimations = useRef<AnimationStates | null>(null)

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
          'accent'
        ),
        pbIconRepeatOff: applyThemeToLottie(
          baseAnimations.current.pbIconRepeatOff,
          themeColors,
          'accent'
        )
      })
    }
    loadAnimations()
  }, [themeColors])

  return (
    animations && (
      <RepeatButton
        animations={animations}
        repeatOff={onRepeatOff}
        repeatAll={onRepeatAll}
        repeatSingle={onRepeatSingle}
        isMobile={isMobile}
      />
    )
  )
}

export default RepeatButtonProvider
