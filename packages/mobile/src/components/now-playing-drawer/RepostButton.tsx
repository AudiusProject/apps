import { useMemo } from 'react'

import IconRepostOffLight from 'app/assets/animations/iconRepostOffLight.json'
import IconRepostOnLight from 'app/assets/animations/iconRepostOnLight.json'
import type { AnimatedButtonProps } from 'app/components/core'
import { AnimatedButton } from 'app/components/core'
import { colorize } from 'app/utils/colorizeLottie'
import { useThemeColors } from 'app/utils/theme'

type RepostButtonProps = Omit<AnimatedButtonProps, 'iconJSON'> & {
  isOwner: boolean
}

export const RepostButton = (props: RepostButtonProps) => {
  const { iconIndex, isOwner = false } = props
  const { neutralLight6, neutral, primary } = useThemeColors()

  const iconJSON = useMemo(() => {
    const ColorizedRepostOnIcon = colorize(IconRepostOnLight, {
      'assets.0.layers.0.shapes.0.it.3.c.k.0.s': isOwner
        ? neutralLight6
        : neutral,
      'assets.0.layers.0.shapes.0.it.3.c.k.1.s': isOwner
        ? neutralLight6
        : primary
    })

    const ColorizedRepostOffIcon = colorize(IconRepostOffLight, {
      'assets.0.layers.0.shapes.0.it.3.c.k.0.s': isOwner
        ? neutralLight6
        : primary,
      'assets.0.layers.0.shapes.0.it.3.c.k.1.s': isOwner
        ? neutralLight6
        : neutral
    })

    return [ColorizedRepostOnIcon, ColorizedRepostOffIcon]
  }, [isOwner, neutral, neutralLight6, primary])

  return (
    <AnimatedButton {...props} haptics={iconIndex === 0} iconJSON={iconJSON} />
  )
}
