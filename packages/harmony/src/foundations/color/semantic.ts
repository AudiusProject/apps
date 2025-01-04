import { Theme } from '../theme/types'

import type { PrimitiveColors } from './primitive'
import { primitiveTheme } from './primitive'

const createSemanticTheme = (theme: Theme, primitives: PrimitiveColors) => ({
  text: {
    default: primitives.neutral.n800,
    subdued: primitives.neutral.n400,
    disabled: primitives.neutral.n150,
    link: primitives.primary.p500,
    accent: primitives.secondary.s300,
    inverse:
      theme === 'day' ? primitives.neutral.n950 : primitives.special.white,

    // Legacy compatibility
    heading: primitives.special.gradient,
    active: primitives.primary.p300,
    staticWhite: primitives.special.white,
    staticStaticWhite: primitives.static.staticWhite,
    warning: primitives.special.orange,
    danger: primitives.special.red,
    premium: primitives.special.lightGreen,
    special: primitives.special.blue
  },
  icon: {
    default: primitives.neutral.n800,
    subdued: primitives.neutral.n400,
    disabled: primitives.neutral.n150,
    link: primitives.primary.p500,
    accent: primitives.secondary.s300,
    inverse:
      theme === 'day' ? primitives.neutral.n950 : primitives.special.white,

    // Legacy compatibility
    heading: primitives.special.gradient,
    active: primitives.primary.p300,
    staticWhite: primitives.special.white,
    staticStaticWhite: primitives.static.staticWhite,
    warning: primitives.special.orange,
    danger: primitives.special.red,
    premium: primitives.special.lightGreen,
    special: primitives.special.blue
  },
  link: {
    default: primitives.neutral.n800,
    subdued: primitives.neutral.n400,
    visible: primitives.primary.p500,
    inverted: primitives.static.white
  },
  background: {
    default: primitives.special.background,
    surface1: primitives.neutral.n25,
    surface2: primitives.neutral.n50,
    white: primitives.special.white,

    // Legacy compatibility
    accent: primitives.secondary.s300
  },
  border: {
    default: primitives.neutral.n100,
    strong: primitives.neutral.n150,
    negative: primitives.special.white,
    accent: primitives.secondary.s300
  },
  focus: {
    default: primitives.secondary.s300
  },
  status: {
    error: primitives.special.red,
    warning: primitives.special.orange,
    success: primitives.special.green,
    danger: primitives.special.red
  }
})

export const semanticTheme = {
  day: createSemanticTheme('day', primitiveTheme.day),
  dark: createSemanticTheme('dark', primitiveTheme.dark),
  matrix: createSemanticTheme('matrix', primitiveTheme.matrix)
}

export type SemanticColors = typeof semanticTheme.day

export type TextColors = keyof SemanticColors['text']
export type IconColors = keyof SemanticColors['icon']
export type BackgroundColors = keyof SemanticColors['background']
export type BorderColors = keyof SemanticColors['border']
export type FocusColors = keyof SemanticColors['focus']
export type StatusColors = keyof SemanticColors['status']
