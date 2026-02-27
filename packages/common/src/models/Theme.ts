/** Color mode - auto follows system, light/dark are explicit. Used in segmented control. */
export enum ThemeMode {
  AUTO = 'auto',
  LIGHT = 'light',
  DARK = 'dark'
}

/** Theme palette - selected in dropdown. Default and classic have light/dark variants. */
export enum ThemePalette {
  DEFAULT = 'default',
  CLASSIC = 'classic',
  MATRIX = 'matrix'
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

/** Legacy theme value - treat as AUTO when encountered */
export const LEGACY_THEME_DEFAULT = 'default'

export enum SystemAppearance {
  LIGHT = 'light',
  DARK = 'dark'
}
