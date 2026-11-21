import { useMemo } from 'react'

import { StyleSheet } from 'react-native'

import IconFavoriteOffLight from 'app/assets/animations/iconFavoriteTrackTileOffLight.json'
import IconFavoriteOnLight from 'app/assets/animations/iconFavoriteTrackTileOnLight.json'
import type { AnimatedButtonProps } from 'app/components/core'
import { AnimatedButton } from 'app/components/core'
import { makeAnimations } from 'app/styles'
import { colorize } from 'app/utils/colorizeLottie'

const styles = StyleSheet.create({
  icon: {
    height: 22,
    width: 22
  },
  iconDisabled: {
    opacity: 0.5
  }
})

const useAnimations = makeAnimations(({ palette }) => {
  const ColorizedOnIcon = colorize(IconFavoriteOnLight, {
    'layers.0.shapes.0.it.1.c.k.0.s': palette.neutralLight4,
    'layers.0.shapes.0.it.1.c.k.1.s': palette.primary
  })

  const ColorizedOffIcon = colorize(IconFavoriteOffLight, {
    'layers.0.shapes.0.it.1.c.k.0.s': palette.primary,
    'layers.0.shapes.0.it.1.c.k.1.s': palette.neutralLight4
  })
  return [ColorizedOnIcon, ColorizedOffIcon]
})

type FavoriteButtonProps = Omit<AnimatedButtonProps, 'iconJSON'>

export const FavoriteButton = (props: FavoriteButtonProps) => {
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
