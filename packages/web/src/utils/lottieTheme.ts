import { Theme, ThemePalette } from '@audius/common/models'
import { primitiveTheme } from '@audius/harmony'

export type LottieThemeColors = {
  primary: string
  secondary: string
  gradientStop1: string
  gradientStop2: string
  neutral?: string
  white?: string
}

const hexToRgba = (hex: string): [number, number, number, number] => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return [r, g, b, a]
}

export const getLottieThemeColors = (
  palette: ThemePalette | null,
  isDark: boolean,
  legacyTheme?: Theme | null
): LottieThemeColors => {
  if (
    palette === ThemePalette.MATRIX ||
    (palette == null && legacyTheme === Theme.MATRIX)
  ) {
    const m = primitiveTheme.matrix
    return {
      primary: m.primary.default,
      secondary: m.secondary.default,
      gradientStop1: m.special.gradientStop1,
      gradientStop2: m.special.gradientStop2,
      neutral: m.neutral.n400,
      white: m.special.white
    }
  }
  if (palette === ThemePalette.CLASSIC) {
    const p = isDark ? primitiveTheme.classicDark : primitiveTheme.classicLight
    return {
      primary: p.primary.default,
      secondary: p.secondary.default,
      gradientStop1: p.special.gradientStop1,
      gradientStop2: p.special.gradientStop2,
      neutral: p.neutral.n400,
      white: p.special.white
    }
  }
  const p = isDark ? primitiveTheme.defaultDark : primitiveTheme.defaultLight
  return {
    primary: p.primary.default,
    secondary: p.secondary.default,
    gradientStop1: p.special.gradientStop1,
    gradientStop2: p.special.gradientStop2,
    neutral: p.neutral.n400,
    white: p.special.white
  }
}

const isGray = (rgba: number[]): boolean => {
  if (rgba.length < 3) return true
  const [r, g, b] = rgba
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max
  return saturation < 0.15
}

const isNearWhite = (rgba: number[]): boolean => {
  if (rgba.length < 3) return false
  const [r, g, b] = rgba
  return r >= 0.97 && g >= 0.97 && b >= 0.97
}

const isNearBlack = (rgba: number[]): boolean => {
  if (rgba.length < 3) return false
  const [r, g, b] = rgba
  return r <= 0.03 && g <= 0.03 && b <= 0.03
}

export type LottieThemeVariant = 'accent' | 'neutral' | 'primary'

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
      if (isNearWhite(value as number[]) && colors.white) {
        return [...hexToRgba(colors.white)]
      }
      if (isNearBlack(value as number[])) {
        return [...(value as number[])]
      }
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
          if (typeof first === 'number') {
            newC.k = replaceColorsInValue(c.k, colors, ctx, variant)
          } else if (Array.isArray(first) && typeof first[0] === 'number') {
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
