import { primitiveTheme as harmonyPrimitiveTheme } from '@audius/harmony/src/foundations/color/primitive'
import { themes as harmonyTheme } from '@audius/harmony/src/foundations/theme/theme'
import { merge } from 'lodash'

// linear-gradient at 315deg
const baseLinearGradient = {
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 }
}

const primitiveOverrides = {
  day: {
    special: {
      gradient: {
        ...baseLinearGradient,
        colors: [
          harmonyPrimitiveTheme.day.special.gradientStop1,
          harmonyPrimitiveTheme.day.special.gradientStop2
        ]
      },
      coinGradient: {
        ...baseLinearGradient,
        colors: [
          harmonyPrimitiveTheme.day.special.coinGradientColor1,
          harmonyPrimitiveTheme.day.special.coinGradientColor2,
          harmonyPrimitiveTheme.day.special.coinGradientColor3
        ]
      }
    }
  },
  dark: {
    special: {
      gradient: {
        ...baseLinearGradient,
        colors: [
          harmonyPrimitiveTheme.dark.special.gradientStop1,
          harmonyPrimitiveTheme.dark.special.gradientStop2
        ]
      },
      coinGradient: {
        ...baseLinearGradient,
        colors: [
          harmonyPrimitiveTheme.dark.special.coinGradientColor1,
          harmonyPrimitiveTheme.dark.special.coinGradientColor2,
          harmonyPrimitiveTheme.dark.special.coinGradientColor3
        ]
      }
    }
  },
  matrix: {
    special: {
      gradient: {
        ...baseLinearGradient,
        colors: [
          harmonyPrimitiveTheme.matrix.special.gradientStop1,
          harmonyPrimitiveTheme.matrix.special.gradientStop2
        ]
      },
      coinGradient: {
        ...baseLinearGradient,
        colors: [
          harmonyPrimitiveTheme.matrix.special.coinGradientColor1,
          harmonyPrimitiveTheme.matrix.special.coinGradientColor2,
          harmonyPrimitiveTheme.matrix.special.coinGradientColor3
        ]
      }
    }
  }
}

const semanticOverrides = {
  day: {
    text: {
      heading: primitiveOverrides.day.special.gradient,
      artistCoin: primitiveOverrides.day.special.coinGradient
    },
    icon: {
      heading: primitiveOverrides.day.special.gradient,
      artistCoin: primitiveOverrides.day.special.coinGradient
    }
  },
  dark: {
    text: {
      heading: primitiveOverrides.dark.special.gradient,
      artistCoin: primitiveOverrides.dark.special.coinGradient
    },
    icon: {
      heading: primitiveOverrides.dark.special.gradient,
      artistCoin: primitiveOverrides.dark.special.coinGradient
    }
  },
  matrix: {
    text: {
      heading: primitiveOverrides.matrix.special.gradient,
      artistCoin: primitiveOverrides.matrix.special.coinGradient
    },
    icon: {
      heading: primitiveOverrides.matrix.special.gradient,
      artistCoin: primitiveOverrides.matrix.special.coinGradient
    }
  }
}

export const colorTheme = {
  day: {
    ...harmonyTheme.day.color,
    special: {
      ...harmonyTheme.day.color.special,
      ...primitiveOverrides.day.special
    },
    text: {
      ...harmonyTheme.day.color.text,
      ...semanticOverrides.day.text
    },
    icon: {
      ...harmonyTheme.day.color.icon,
      ...semanticOverrides.day.icon
    }
  },
  dark: {
    ...harmonyTheme.dark.color,
    special: {
      ...harmonyTheme.dark.color.special,
      ...primitiveOverrides.dark.special
    },
    text: {
      ...harmonyTheme.dark.color.text,
      ...semanticOverrides.dark.text
    },
    icon: {
      ...harmonyTheme.dark.color.icon,
      ...semanticOverrides.dark.icon
    }
  },
  matrix: {
    ...harmonyTheme.matrix.color,
    special: {
      ...harmonyTheme.matrix.color.special,
      ...primitiveOverrides.matrix.special
    },
    text: {
      ...harmonyTheme.matrix.color.text,
      ...semanticOverrides.matrix.text
    },
    icon: {
      ...harmonyTheme.matrix.color.icon,
      ...semanticOverrides.matrix.icon
    }
  }
}

// Only used for story
export const primitiveTheme = merge(
  {},
  harmonyPrimitiveTheme,
  primitiveOverrides
)

export type {
  BackgroundColors,
  IconColors,
  SpecialColors,
  TextColors
} from '@audius/harmony/src/foundations/color'
