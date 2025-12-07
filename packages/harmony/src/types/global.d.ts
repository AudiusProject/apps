/// <reference types="react" />

// Override Storybook's Theme with HarmonyTheme globally for Harmony components
import type { HarmonyTheme } from '../foundations/theme'

declare module '@storybook/theming' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface Theme extends HarmonyTheme {}
}
