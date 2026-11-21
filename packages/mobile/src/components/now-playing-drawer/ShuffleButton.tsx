import IconShuffleOffLight from 'app/assets/animations/iconShuffleOffLight.json'
import IconShuffleOnLight from 'app/assets/animations/iconShuffleOnLight.json'
import type { AnimatedButtonProps, Haptics } from 'app/components/core'
import { AnimatedButton } from 'app/components/core'
import { makeAnimations } from 'app/styles'
import { colorize } from 'app/utils/colorizeLottie'

const useAnimations = makeAnimations(({ palette }) => {
  const { neutral, primary } = palette
  const ColorizedShuffleOnIcon = colorize(IconShuffleOnLight, {
    'layers.0.shapes.0.it.2.c.k.0.s': neutral,
    'layers.0.shapes.0.it.2.c.k.0.e': primary,
    'layers.0.shapes.1.it.1.c.k.0.s': neutral,
    'layers.0.shapes.1.it.1.c.k.0.e': primary,
    'layers.1.shapes.0.it.2.c.k.0.s': neutral,
    'layers.1.shapes.0.it.2.c.k.0.e': primary,
    'layers.1.shapes.1.it.1.c.k.0.s': neutral,
    'layers.1.shapes.1.it.1.c.k.0.e': primary
  })

  const ColorizedShuffleOffIcon = colorize(IconShuffleOffLight, {
    'layers.0.shapes.0.it.2.c.k.0.s': primary,
    'layers.0.shapes.0.it.2.c.k.0.e': neutral,
    'layers.0.shapes.1.it.1.c.k.0.s': primary,
    'layers.0.shapes.1.it.1.c.k.0.e': neutral,
    'layers.1.shapes.0.it.2.c.k.0.s': primary,
    'layers.1.shapes.0.it.2.c.k.0.e': neutral,
    'layers.1.shapes.1.it.1.c.k.0.s': primary,
    'layers.1.shapes.1.it.1.c.k.0.e': neutral
  })

  return [ColorizedShuffleOnIcon, ColorizedShuffleOffIcon]
})

type ShuffleButtonProps = Omit<AnimatedButtonProps, 'iconJSON'>

const hapticsConfig: Haptics[] = ['medium', false]

export const ShuffleButton = ({ isActive, ...props }: ShuffleButtonProps) => {
  const animations = useAnimations()

  return (
    <AnimatedButton
      {...props}
      hapticsConfig={hapticsConfig}
      iconJSON={animations}
    />
  )
}
