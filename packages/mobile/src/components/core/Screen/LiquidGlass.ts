import type { ComponentType } from 'react'

import type { LiquidGlassViewProps } from '@callstack/liquid-glass'
import { Platform, TurboModuleRegistry, View } from 'react-native'

/**
 * The glass view is native code, but OTA updates can deliver this JS to an
 * older binary that doesn't include it. The library looks its module up with
 * `getEnforcing` on import, which would throw there, so check for it first and
 * only require the library when it's present.
 */
const hasNativeModule =
  Platform.OS === 'ios' &&
  TurboModuleRegistry.get('NativeLiquidGlassModule') != null

const liquidGlass = hasNativeModule
  ? (require('@callstack/liquid-glass') as typeof import('@callstack/liquid-glass'))
  : null

/** True on iOS 26+ builds that include the native glass view. */
export const isLiquidGlassAvailable =
  liquidGlass?.isLiquidGlassSupported ?? false

/** iOS 26 glass material. Falls back to a plain `View` everywhere else. */
export const LiquidGlassView: ComponentType<LiquidGlassViewProps> =
  liquidGlass?.LiquidGlassView ?? View
