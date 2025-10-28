import { Theme } from '@audius/common/models'
import type { CommonState } from '@audius/common/store'
import { themeSelectors } from '@audius/common/store'
import type { HarmonyTheme } from '@audius/harmony/src/foundations/theme/theme'
import { themes } from '@audius/harmony/src/foundations/theme/theme'
import { useSelector } from 'react-redux'

const { getTheme, getSystemAppearance } = themeSelectors

export { Theme } from '@audius/common/models'

export type ThemeColors = {
  background: string
  backgroundSecondary: string
  backgroundSurface: string
  backgroundSurface2: string
  borderDefault: string
  borderStrong: string
  primary: string
  primaryDark1: string
  primaryDark2: string
  primaryLight1: string
  primaryLight2: string
  secondary: string
  secondaryDark1: string
  secondaryDark2: string
  secondaryLight1: string
  secondaryLight2: string
  neutral: string
  neutralDark1: string
  neutralDark2: string
  neutralDark3: string
  neutralLight1: string
  neutralLight2: string
  neutralLight3: string
  neutralLight4: string
  neutralLight5: string
  neutralLight6: string
  neutralLight7: string
  neutralLight8: string
  neutralLight9: string
  neutralLight10: string
  white: string
  accentRed: string
  accentRedDark1: string
  accentRedLight1: string
  accentGreen: string
  accentGreenDark1: string
  accentGreenLight1: string
  accentOrange: string
  accentOrangeDark1: string
  accentOrangeLight1: string
  accentPurple: string
  shadow: string
  staticTwitterBlue: string
  staticWhite: string
  // TODO: Remove when theme v2 is enabled
  inverse: string
  staticNeutral: string
  staticNeutralLight2: string
  staticNeutralLight8: string
  staticAccentGreenLight1: string
  specialLightGreen: string
  specialGreen: string
  staticPrimary: string
  staticSecondary: string
  pageHeaderGradientColor1: string
  pageHeaderGradientColor2: string
  skeleton: string
  skeletonHighlight: string
  statTileText: string
  progressBackground: string
  accentBlue: string
  textIconSubdued: string
  focus: string
}

const createMobileThemeFromHarmony = (
  harmonyTheme: HarmonyTheme
): ThemeColors => {
  const { color } = harmonyTheme

  return {
    background: color.special.background,
    backgroundSecondary: color.background.surface1,
    backgroundSurface: color.background.surface1,
    backgroundSurface2: color.background.surface2,
    borderDefault: color.border.default,
    borderStrong: color.border.strong,
    primary: color.primary.p300,
    primaryDark1: color.primary.p400,
    primaryDark2: color.primary.p500,
    primaryLight1: color.primary.p200,
    primaryLight2: color.primary.p100,
    secondary: color.secondary.s300,
    secondaryDark1: color.secondary.s400,
    secondaryDark2: color.secondary.s500,
    secondaryLight1: color.secondary.s200,
    secondaryLight2: color.secondary.s100,
    neutral: color.neutral.n800,
    neutralDark1: color.neutral.n900,
    neutralDark2: color.neutral.n950,
    neutralDark3: color.neutral.n950, // No direct mapping
    neutralLight1: color.neutral.n700,
    neutralLight2: color.neutral.n600,
    neutralLight3: color.neutral.n500,
    neutralLight4: color.neutral.n400,
    neutralLight5: color.neutral.n300,
    neutralLight6: color.neutral.n200,
    neutralLight7: color.neutral.n150,
    neutralLight8: color.neutral.n100,
    neutralLight9: color.neutral.n50,
    neutralLight10: color.neutral.n25,
    white: color.special.white,
    accentRed: color.special.red,
    accentRedDark1: color.special.darkRed,
    accentRedLight1: color.special.red, // No direct mapping
    accentGreen: color.special.green,
    accentGreenDark1: color.special.lightGreen,
    accentGreenLight1: color.special.green, // No direct mapping
    accentOrange: color.special.orange,
    accentOrangeDark1: color.special.orange, // No direct mapping
    accentOrangeLight1: color.special.orange, // No direct mapping
    accentPurple: color.secondary.s300, // Using secondary as fallback
    shadow: color.border.default,
    staticTwitterBlue: color.special.blue,
    staticWhite: color.static.white,
    inverse: color.static.staticWhite,
    staticNeutral: color.neutral.n800,
    staticNeutralLight2: color.neutral.n600,
    staticNeutralLight8: color.neutral.n100,
    staticAccentGreenLight1: color.special.lightGreen,
    specialLightGreen: color.special.lightGreen,
    specialGreen: color.special.green,
    staticPrimary: color.static.primary,
    staticSecondary: color.static.secondary,
    pageHeaderGradientColor1: color.special.gradientStop1,
    pageHeaderGradientColor2: color.special.gradientStop2,
    skeleton: color.neutral.n50,
    skeletonHighlight: color.neutral.n100,
    statTileText: color.secondary.s300, // Using secondary as fallback
    progressBackground: color.neutral.n200,
    accentBlue: color.special.blue,
    textIconSubdued: color.text.subdued,
    focus: color.focus.default
  }
}

export const defaultTheme = createMobileThemeFromHarmony(themes.day)
export const darkTheme = createMobileThemeFromHarmony(themes.dark)
export const matrixTheme = createMobileThemeFromHarmony(themes.matrix)

export const themeColorsByThemeVariant = {
  [Theme.DEFAULT]: defaultTheme,
  [Theme.DARK]: darkTheme,
  [Theme.MATRIX]: matrixTheme
}

export const selectSystemTheme = (state: CommonState) => {
  const systemAppearance = getSystemAppearance(state)
  const systemTheme = systemAppearance === 'dark' ? Theme.DARK : Theme.DEFAULT
  return themeColorsByThemeVariant[systemTheme]
}

export const useThemeVariant = (): keyof typeof themeColorsByThemeVariant => {
  const theme = useSelector(getTheme)
  const systemAppearance = useSelector(getSystemAppearance)
  const systemTheme = systemAppearance === 'dark' ? Theme.DARK : Theme.DEFAULT
  return theme === Theme.AUTO ? systemTheme : (theme ?? Theme.DEFAULT)
}

export const useThemeColors = () => {
  const themeVariant = useThemeVariant()
  return themeColorsByThemeVariant[themeVariant]
}

export const useThemePalette = () => {
  const themeVariant = useThemeVariant()
  return themeColorsByThemeVariant[themeVariant]
}

export const useColor = (color: string): string => {
  const theme = useThemeColors()
  return (theme as any)[color]
}

// Uses normalColor when in light/dark mode, but "special color" when in other mode
export const useSpecialColor = (normalColor: string, specialColor: string) => {
  const theme = useSelector(getTheme)
  const themeVariant = useThemeColors()
  if (theme === Theme.MATRIX) {
    return (themeVariant as any)[specialColor]
  }
  return (themeVariant as any)[normalColor]
}

export const useTheme = (baseStyles: object, toTheme: object) => {
  const themeStyles = useThemeColors()

  const newStyles = {}
  Object.keys(toTheme).forEach((key) => {
    // @ts-ignore
    if (toTheme[key] in themeStyles) {
      // @ts-ignore
      newStyles[key] = themeStyles[toTheme[key]]
    }
  })
  return { ...baseStyles, ...newStyles }
}
