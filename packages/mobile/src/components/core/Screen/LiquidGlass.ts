import type { ComponentType } from 'react'

import type { LiquidGlassViewProps } from '@callstack/liquid-glass'
import { Platform, TurboModuleRegistry, View } from 'react-native'

const hasNativeModule =
  Platform.OS === 'ios' &&
  TurboModuleRegistry.get('NativeLiquidGlassModule') != null

const liquidGlass = hasNativeModule
  ? (require('@callstack/liquid-glass') as typeof import('@callstack/liquid-glass'))
  : null

export const isLiquidGlassAvailable =
  liquidGlass?.isLiquidGlassSupported ?? false

export const LiquidGlassView: ComponentType<LiquidGlassViewProps> =
  liquidGlass?.LiquidGlassView ?? View
