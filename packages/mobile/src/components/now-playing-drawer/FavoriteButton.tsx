import { useMemo } from 'react'

import IconFavoriteOffLight from 'app/assets/animations/iconFavoriteOffLight.json'
import IconFavoriteOnLight from 'app/assets/animations/iconFavoriteOnLight.json'
import type { AnimatedButtonProps } from 'app/components/core'
import { AnimatedButton } from 'app/components/core'
import { colorize } from 'app/utils/colorizeLottie'
import { useThemeColors } from 'app/utils/theme'

type FavoriteButtonProps = Omit<AnimatedButtonProps, 'iconJSON'> & {
  isOwner?: boolean
}

export const FavoriteButton = (props: FavoriteButtonProps) => {
  const { iconIndex, isOwner = false } = props
  const { neutralLight6, neutral, primary } = useThemeColors()

  const iconJSON = useMemo(() => {
    const ColorizedFavoriteOnIcon = colorize(IconFavoriteOnLight, {
      'layers.0.shapes.0.it.1.c.k.0.s': isOwner ? neutralLight6 : neutral,
      'layers.0.shapes.0.it.1.c.k.1.s': isOwner ? neutralLight6 : primary
    })

    const ColorizedFavoriteOffIcon = colorize(IconFavoriteOffLight, {
      'layers.0.shapes.0.it.1.c.k.0.s': isOwner ? neutralLight6 : primary,
      'layers.0.shapes.0.it.1.c.k.1.s': isOwner ? neutralLight6 : neutral
    })
    return [ColorizedFavoriteOnIcon, ColorizedFavoriteOffIcon]
  }, [isOwner, neutral, neutralLight6, primary])

  return (
    <AnimatedButton {...props} haptics={iconIndex === 0} iconJSON={iconJSON} />
  )
}
