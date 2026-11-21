import IconRepeatAllLight from 'app/assets/animations/iconRepeatAllLight.json'
import IconRepeatOffLight from 'app/assets/animations/iconRepeatOffLight.json'
import IconRepeatSingleLight from 'app/assets/animations/iconRepeatSingleLight.json'
import type { AnimatedButtonProps, Haptics } from 'app/components/core'
import { AnimatedButton } from 'app/components/core'
import { makeAnimations } from 'app/styles'
import { colorize } from 'app/utils/colorizeLottie'

const useAnimations = makeAnimations(({ palette }) => {
  const { background, primary, neutral } = palette

  const ColorizedRepeatAllIcon = colorize(IconRepeatAllLight, {
    'assets.0.layers.0.shapes.0.it.1.c.k': background,
    'assets.0.layers.0.shapes.1.it.1.c.k': primary,
    'assets.0.layers.0.shapes.2.it.1.c.k': background,
    'assets.0.layers.0.shapes.3.it.1.c.k': '#000000',
    'assets.0.layers.1.shapes.0.it.1.c.k.0.s': neutral,
    'assets.0.layers.1.shapes.0.it.1.c.k.0.e': primary,
    'assets.0.layers.1.shapes.0.it.1.c.k.1.s': primary,
    'assets.0.layers.1.shapes.0.it.1.c.k.1.e': primary,
    'assets.0.layers.1.shapes.0.it.1.c.k.2.s': primary,
    'assets.0.layers.1.shapes.0.it.1.c.k.2.e': neutral,
    'layers.1.shapes.0.it.1.c.k': background,
    'layers.1.shapes.1.it.1.c.k': primary,
    'layers.1.shapes.2.it.1.c.k': background,
    'layers.1.shapes.3.it.1.c.k': '#000000',
    'layers.2.shapes.0.it.1.c.k.0.s': neutral,
    'layers.2.shapes.0.it.1.c.k.0.e': primary,
    'layers.2.shapes.0.it.1.c.k.1.s': primary,
    'layers.2.shapes.0.it.1.c.k.1.e': primary,
    'layers.2.shapes.0.it.1.c.k.2.s': primary,
    'layers.2.shapes.0.it.1.c.k.2.e': neutral
  })

  const ColorizedRepeatSingleIcon = colorize(IconRepeatSingleLight, {
    'layers.0.shapes.0.it.1.c.k': background,
    'layers.0.shapes.1.it.1.c.k': primary,
    'layers.0.shapes.2.it.1.c.k': background,
    'layers.0.shapes.3.it.1.c.k': '#000000',
    'layers.1.shapes.0.it.1.c.k.0.s': neutral,
    'layers.1.shapes.0.it.1.c.k.0.e': primary,
    'layers.1.shapes.0.it.1.c.k.1.s': primary,
    'layers.1.shapes.0.it.1.c.k.1.e': primary,
    'layers.1.shapes.0.it.1.c.k.2.s': primary,
    'layers.1.shapes.0.it.1.c.k.2.e': neutral
  })

  const ColorizedRepeatOffIcon = colorize(IconRepeatOffLight, {
    'layers.0.shapes.0.it.1.c.k': background,
    'layers.0.shapes.1.it.1.c.k': primary,
    'layers.0.shapes.2.it.1.c.k': background,
    'layers.0.shapes.3.it.1.c.k': '#000000',
    'layers.1.shapes.0.it.1.c.k.0.s': neutral,
    'layers.1.shapes.0.it.1.c.k.0.e': primary,
    'layers.1.shapes.0.it.1.c.k.1.s': primary,
    'layers.1.shapes.0.it.1.c.k.1.e': primary,
    'layers.1.shapes.0.it.1.c.k.2.s': primary,
    'layers.1.shapes.0.it.1.c.k.2.e': neutral
  })

  return [
    ColorizedRepeatAllIcon,
    ColorizedRepeatSingleIcon,
    ColorizedRepeatOffIcon
  ]
})

type RepeatButtonProps = Omit<AnimatedButtonProps, 'iconJSON'>

const hapticsConfig: Haptics[] = ['light', 'medium', false]

export const RepeatButton = (props: RepeatButtonProps) => {
  const { isActive: isActiveIgnored, ...other } = props
  const animations = useAnimations()

  return (
    <AnimatedButton
      {...other}
      hapticsConfig={hapticsConfig}
      iconJSON={animations}
    />
  )
}
