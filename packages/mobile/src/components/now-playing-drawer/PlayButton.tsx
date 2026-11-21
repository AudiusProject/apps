import { useCallback, useEffect, useState } from 'react'

import { playbackActions, playbackSelectors } from '@audius/common/store'
import { MIN_BUFFERING_DELAY_MS } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import IconPause from 'app/assets/animations/iconPause.json'
import IconPlay from 'app/assets/animations/iconPlay.json'
import IconLoadingSpinner from 'app/assets/animations/iconPlayLoadingSpinner.json'
import type { AnimatedButtonProps } from 'app/components/core'
import { AnimatedButton } from 'app/components/core'
import { makeAnimations } from 'app/styles'
import { colorize } from 'app/utils/colorizeLottie'
import { Theme } from 'app/utils/theme'

const { pause, play } = playbackActions
const { getPlaying, getBuffering } = playbackSelectors

const useAnimatedIcons = makeAnimations(({ palette, type }) => {
  const iconColor =
    type === Theme.MATRIX ? palette.background : palette.staticWhite

  const primaryBG = palette.primary

  const ColorizedPlayIcon = colorize(IconPlay, {
    'layers.0.shapes.0.it.1.c.k': iconColor,
    'layers.1.shapes.0.it.1.c.k': iconColor,
    'layers.1.shapes.1.it.1.c.k': iconColor,
    'layers.2.shapes.0.it.1.c.k': primaryBG
  })

  const ColorizedPauseIcon = colorize(IconPause, {
    'layers.0.shapes.0.it.1.c.k': iconColor,
    'layers.1.shapes.0.it.1.c.k': iconColor,
    'layers.1.shapes.1.it.1.c.k': iconColor,
    'layers.2.shapes.0.it.1.c.k': primaryBG
  })

  const ColorizedSpinnerIcon = colorize(IconLoadingSpinner, {
    'layers.0.shapes.1.c.k': iconColor,
    'layers.1.shapes.0.it.2.c.k': primaryBG
  })
  return [ColorizedPlayIcon, ColorizedPauseIcon, ColorizedSpinnerIcon]
})

type PlayButtonProps = Omit<AnimatedButtonProps, 'iconJSON' | 'iconIndex'>

export const PlayButton = ({ isActive, ...props }: PlayButtonProps) => {
  const isPlaying = useSelector(getPlaying)
  const [showBufferingState, setShowBufferingState] = useState(false)

  const isBuffering = useSelector(getBuffering)

  useEffect(() => {
    let timeout
    if (isBuffering) {
      timeout = setTimeout(() => {
        setShowBufferingState(true)
      }, MIN_BUFFERING_DELAY_MS)
    } else {
      clearTimeout(timeout)
      setShowBufferingState(false)
    }

    return () => {
      clearTimeout(timeout)
    }
  }, [isBuffering])

  const dispatch = useDispatch()
  const animatedIcons = useAnimatedIcons()

  const handlePress = useCallback(() => {
    if (isPlaying) {
      dispatch(pause())
    } else {
      dispatch(play())
    }
  }, [isPlaying, dispatch])

  return (
    <AnimatedButton
      {...props}
      resizeMode='cover'
      haptics
      iconJSON={animatedIcons}
      onPress={handlePress}
      iconIndex={showBufferingState ? 2 : isPlaying ? 1 : 0}
      lottieProps={
        showBufferingState ? { loop: true, autoPlay: true } : undefined
      }
    />
  )
}
