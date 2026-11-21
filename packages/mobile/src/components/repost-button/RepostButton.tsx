import { useMemo } from 'react'

import { StyleSheet } from 'react-native'

import IconRepostOffLight from 'app/assets/animations/iconRepostTrackTileOffLight.json'
import IconRepostOnLight from 'app/assets/animations/iconRepostTrackTileOnLight.json'
import type { AnimatedButtonProps } from 'app/components/core'
import { AnimatedButton } from 'app/components/core'
import { makeAnimations } from 'app/styles'
import { colorize } from 'app/utils/colorizeLottie'

const styles = StyleSheet.create({
  icon: {
    height: 22,
    width: 22
  },
  iconDisabled: { opacity: 0.5 }
})

const useAnimations = makeAnimations(({ palette }) => {
  const ColorizedOnIcon = colorize(IconRepostOnLight, {
    'assets.0.layers.0.shapes.0.it.3.c.k.0.s': palette.neutralLight4,
    'assets.0.layers.0.shapes.0.it.3.c.k.1.s': palette.primary
  })

  const ColorizedOffIcon = colorize(IconRepostOffLight, {
    'assets.0.layers.0.shapes.0.it.3.c.k.0.s': palette.primary,
    'assets.0.layers.0.shapes.0.it.3.c.k.1.s': palette.neutralLight4
  })

  return [ColorizedOnIcon, ColorizedOffIcon]
})

type RepostButtonProps = Omit<AnimatedButtonProps, 'iconJSON'>

export const RepostButton = (props: RepostButtonProps) => {
  const { isActive, wrapperStyle: wrapperStyleProp, ...other } = props
  const { isDisabled } = other
  const wrapperStyle = useMemo(
    () => [styles.icon, isDisabled && styles.iconDisabled, wrapperStyleProp],
    [isDisabled, wrapperStyleProp]
  )

  const animations = useAnimations()

  return (
    <AnimatedButton
      {...other}
      haptics={!isActive}
      iconIndex={isActive ? 1 : 0}
      iconJSON={animations}
      wrapperStyle={wrapperStyle}
    />
  )
}
