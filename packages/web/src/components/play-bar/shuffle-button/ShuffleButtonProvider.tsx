import { useState, useEffect, useRef } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'
import { useIsDarkMode, useIsMatrix } from 'utils/theme/theme'

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
  const isMatrix = useIsMatrix()
  const darkMode = useIsDarkMode()
  const isMobile = useIsMobile()
  const [animations, setAnimations] = useState<AnimationStates | null>(null)
  const defaultAnimations = useRef<AnimationStates | null>(null)
  const darkAnimations = useRef<AnimationStates | null>(null)
  const matrixAnimations = useRef<AnimationStates | null>(null)

  useEffect(() => {
    const loadAnimations = async () => {
      if (isMatrix) {
        if (!matrixAnimations.current) {
          const { default: pbIconShuffleOff } = (await import(
            '../../../assets/animations/pbIconShuffleOffMatrix.json'
          )) as any
          const { default: pbIconShuffleOn } = (await import(
            '../../../assets/animations/pbIconShuffleOnMatrix.json'
          )) as any
          matrixAnimations.current = {
            pbIconShuffleOff,
            pbIconShuffleOn
          }
        }
        setAnimations({ ...matrixAnimations.current })
      } else if (darkMode) {
        if (!darkAnimations.current) {
          const { default: pbIconShuffleOff } = (await import(
            '../../../assets/animations/pbIconShuffleOffDark.json'
          )) as any
          const { default: pbIconShuffleOn } = (await import(
            '../../../assets/animations/pbIconShuffleOnDark.json'
          )) as any
          darkAnimations.current = {
            pbIconShuffleOff,
            pbIconShuffleOn
          }
        }
        setAnimations({ ...darkAnimations.current })
      } else {
        if (!defaultAnimations.current) {
          const { default: pbIconShuffleOff } = (await import(
            '../../../assets/animations/pbIconShuffleOff.json'
          )) as any
          const { default: pbIconShuffleOn } = (await import(
            '../../../assets/animations/pbIconShuffleOn.json'
          )) as any
          defaultAnimations.current = {
            pbIconShuffleOff,
            pbIconShuffleOn
          }
        }
        setAnimations({ ...defaultAnimations.current })
      }
    }
    loadAnimations()
  }, [darkMode, setAnimations, isMatrix])

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
