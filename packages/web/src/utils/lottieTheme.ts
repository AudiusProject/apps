/**
 * Runtime Lottie theming - applies theme colors to Lottie JSON in-place
 * instead of requiring separate assets per theme (light/dark/matrix).
 *
 * Theme model: ThemePalette (DEFAULT | CLASSIC | MATRIX) × ThemeMode (LIGHT | DARK | AUTO)
 * Maps to: default-light, default-dark, classic-light, classic-dark, matrix
 */

import { Theme, ThemePalette } from '@audius/common/models'
import { primitiveTheme } from '@audius/harmony'

export type LottieThemeColors = {
  /** Primary accent - used for fills, active states */
  primary: string
  /** Secondary accent - used for gradients, strokes */
  secondary: string
  /** Gradient start - for animations with gradient fills */
  gradientStop1: string
  /** Gradient end - for animations with gradient fills */
  gradientStop2: string
  /** Neutral/inactive - for outlines, inactive states (optional, grays often kept) */
  neutral?: string
}

const hexToRgba = (hex: string): [number, number, number, number] => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return [r, g, b, a]
}

/**
 * Get Lottie theme colors for the current palette and mode.
 * Uses harmony primitiveTheme for consistency with the design system.
 *
 * When palette is null (legacy theme model), legacyTheme is used:
 * - MATRIX → matrix palette
 * - LIGHT/DARK/AUTO → classic palette with appropriate mode
 */
export const getLottieThemeColors = (
  palette: ThemePalette | null,
  isDark: boolean,
  /** Legacy theme - used when palette is null (e.g. NEW_THEME_MODEL off) */
  legacyTheme?: Theme | null
): LottieThemeColors => {
  if (palette === ThemePalette.MATRIX || legacyTheme === Theme.MATRIX) {
    const m = primitiveTheme.matrix
    return {
      primary: m.primary.default,
      secondary: m.secondary.default,
      gradientStop1: m.special.gradientStop1,
      gradientStop2: m.special.gradientStop2,
      neutral: m.neutral.n400
    }
  }
  const useClassic =
    palette === ThemePalette.CLASSIC || (palette == null && legacyTheme != null)
  if (useClassic) {
    const p = isDark ? primitiveTheme.classicDark : primitiveTheme.classicLight
    return {
      primary: p.primary.default,
      secondary: p.secondary.default,
      gradientStop1: p.special.gradientStop1,
      gradientStop2: p.special.gradientStop2,
      neutral: p.neutral.n400
    }
  }
  // ThemePalette.DEFAULT or null with no legacy theme
  const p = isDark ? primitiveTheme.defaultDark : primitiveTheme.defaultLight
  return {
    primary: p.primary.default,
    secondary: p.secondary.default,
    gradientStop1: p.special.gradientStop1,
    gradientStop2: p.special.gradientStop2,
    neutral: p.neutral.n400
  }
}

/** Check if [r,g,b,a] is a gray (low saturation) - these we may treat differently */
const isGray = (rgba: number[]): boolean => {
  if (rgba.length < 3) return true
  const [r, g, b] = rgba
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max
  return saturation < 0.15
}

/** 'accent' = active/on state (primary/gradient), 'neutral' = off state, 'primary' = solid primary for consistency */
export type LottieThemeVariant = 'accent' | 'neutral' | 'primary'

/**
 * Deep clone with color replacement - Lottie stores colors as [r,g,b,a] 0-1.
 * - Gray colors (low saturation) → theme neutral if provided
 * - Accent colors → accent variant: primary/gradient; neutral variant: theme neutral; primary variant: solid primary
 */
const replaceColorsInValue = (
  value: unknown,
  colors: LottieThemeColors,
  ctx: { accentIndex: number },
  variant: LottieThemeVariant
): unknown => {
  if (Array.isArray(value)) {
    if (
      value.length === 4 &&
      value.every((x) => typeof x === 'number' && x >= 0 && x <= 1.01)
    ) {
      const isGrayColor = isGray(value as number[])
      if (isGrayColor && colors.neutral) {
        return [...hexToRgba(colors.neutral)]
      }
      if (variant === 'neutral' && colors.neutral) {
        return [...hexToRgba(colors.neutral)]
      }
      if (variant === 'primary') {
        return [...hexToRgba(colors.primary)]
      }
      const idx = ctx.accentIndex++
      return [
        ...hexToRgba(idx === 0 ? colors.gradientStop1 : colors.gradientStop2)
      ]
    }
    return value.map((v) => replaceColorsInValue(v, colors, ctx, variant))
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('c' in obj && obj.c && typeof obj.c === 'object') {
      const c = obj.c as { a?: number; k?: unknown; ix?: number }
      if ('k' in c && c.k !== undefined) {
        ctx.accentIndex = 0
        const newObj = { ...obj }
        const newC = { ...c }
        if (Array.isArray(c.k) && c.k.length > 0) {
          const first = c.k[0]
          if (Array.isArray(first) && typeof first[0] === 'number') {
            newC.k = replaceColorsInValue(c.k, colors, ctx, variant)
          } else if (first && typeof first === 'object' && 's' in first) {
            newC.k = (c.k as { s?: number[]; e?: number[] }[]).map((kf) => {
              const newKf = { ...kf }
              if (Array.isArray(kf.s)) {
                newKf.s = replaceColorsInValue(
                  kf.s,
                  colors,
                  ctx,
                  variant
                ) as number[]
              }
              if (Array.isArray(kf.e)) {
                newKf.e = replaceColorsInValue(
                  kf.e,
                  colors,
                  ctx,
                  variant
                ) as number[]
              }
              return newKf
            })
          }
        }
        newObj.c = newC
        return newObj
      }
    }
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = replaceColorsInValue(v, colors, ctx, variant)
    }
    return result
  }
  return value
}

/**
 * Apply theme colors to a Lottie animation JSON.
 * Returns a deep clone with colors replaced by the theme palette.
 * - variant 'accent': active/on state - uses gradient colors (gradientStop1/2)
 * - variant 'neutral': off state - uses theme neutral/default color
 * - variant 'primary': solid primary for consistent active states across icons
 */
export const applyThemeToLottie = (
  lottieJson: object,
  colors: LottieThemeColors,
  variant: LottieThemeVariant = 'accent'
): object => {
  const ctx = { accentIndex: 0 }
  return replaceColorsInValue(
    JSON.parse(JSON.stringify(lottieJson)),
    colors,
    ctx,
    variant
  ) as object
}
