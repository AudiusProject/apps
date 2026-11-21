export enum ThemeMode {
  AUTO = 'auto',
  LIGHT = 'light',
  DARK = 'dark'
}

export enum ThemePalette {
  DEFAULT = 'default',
  CLASSIC = 'classic',
  MATRIX = 'matrix'
}

export enum FrostedSurfaceIntensity {
  OFF = 'off',
  SUBTLE = 'subtle',
  DEFAULT = 'default',
  STRONG = 'strong'
}

/**
 * @deprecated Use ThemePalette + ThemeMode. Legacy theme enum.
 * - LIGHT/DARK/AUTO = mode (map to ThemeMode)
 * - MATRIX = palette (map to ThemePalette.MATRIX)
 */
export enum Theme {
  DARK = 'dark',
  AUTO = 'auto',
  MATRIX = 'matrix',
  LIGHT = 'light'
}

export const LEGACY_THEME_DEFAULT = 'default'

export enum SystemAppearance {
  LIGHT = 'light',
  DARK = 'dark'
}
