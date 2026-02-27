import { useState, useEffect, useRef } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'
import { applyThemeToLottie } from 'utils/lottieTheme'
import { useLottieThemeColors } from 'utils/theme/theme'

import ShuffleButton from './ShuffleButton'

type ShuffleButtonProviderProps = {
  onShuffleOn: () => void
  onShuffleOff: () => void
}

type AnimationStates = {
  pbIconShuffleOff: object
  pbIconShuffleOn: object
}

const ShuffleButtonProvider = ({
  onShuffleOn,
  onShuffleOff
}: ShuffleButtonProviderProps) => {
  const themeColors = useLottieThemeColors()
  const isMobile = useIsMobile()
  const [animations, setAnimations] = useState<AnimationStates | null>(null)
  const baseAnimations = useRef<AnimationStates | null>(null)

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
          'neutral'
        ),
        pbIconShuffleOn: applyThemeToLottie(
          baseAnimations.current.pbIconShuffleOn,
          themeColors,
          'accent'
        )
      })
    }
    loadAnimations()
  }, [themeColors])

  return (
    animations && (
      <ShuffleButton
        animations={animations}
        shuffleOn={onShuffleOn}
        shuffleOff={onShuffleOff}
        isMobile={isMobile}
      />
    )
  )
}

export default ShuffleButtonProvider
