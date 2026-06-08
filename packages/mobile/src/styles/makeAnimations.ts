import { Theme } from '@audius/common/models'

import type { ResolvedThemeName, ThemeColors } from 'app/utils/theme'
import {
  useThemeVariant,
  darkTheme,
  matrixTheme,
  defaultTheme,
  defaultLightThemeColors,
  defaultDarkThemeColors
} from 'app/utils/theme'

type AnimationCreatorConfig = { palette: ThemeColors; type: Theme }

export const makeAnimations = <TReturn>(
  animationCreator: (config: AnimationCreatorConfig) => TReturn
) => {
  const lightAnimations = animationCreator({
    palette: defaultTheme,
    type: Theme.LIGHT
  })
  const darkAnimations = animationCreator({
    palette: darkTheme,
    type: Theme.DARK
  })
  const matrixAnimations = animationCreator({
    palette: matrixTheme,
    type: Theme.MATRIX
  })
  const defaultLightAnimations = animationCreator({
    palette: defaultLightThemeColors,
    type: Theme.LIGHT
  })
  const defaultDarkAnimations = animationCreator({
    palette: defaultDarkThemeColors,
    type: Theme.DARK
  })

  const themedAnimations: Record<ResolvedThemeName, TReturn> = {
    'default-light': defaultLightAnimations,
    'default-dark': defaultDarkAnimations,
    'classic-light': lightAnimations,
    'classic-dark': darkAnimations,
    matrix: matrixAnimations
  }

  return function useAnimations(): TReturn {
    const themeVariant = useThemeVariant()
    return themedAnimations[themeVariant]
  }
}
