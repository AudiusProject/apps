import { Theme } from '@audius/common/models'

import type { ThemeColors } from 'app/utils/theme'
import {
  useThemeVariant,
  darkTheme,
  matrixTheme,
  defaultTheme
} from 'app/utils/theme'

type AnimationCreatorConfig = { palette: ThemeColors; type: Theme }

export const makeAnimations = <TReturn>(
  animationCreator: (config: AnimationCreatorConfig) => TReturn
) => {
  const lightAnimations = animationCreator({
    palette: defaultTheme,
    type: Theme.LIGHT
  })

  const themedAnimations = {
    [Theme.LIGHT]: lightAnimations,
    [Theme.DARK]: animationCreator({
      palette: darkTheme,
      type: Theme.DARK
    }),
    [Theme.MATRIX]: animationCreator({
      palette: matrixTheme,
      type: Theme.MATRIX
    })
  }

  return function useAnimations(): TReturn {
    const themeVariant = useThemeVariant()
    return themedAnimations[themeVariant]
  }
}
