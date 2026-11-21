import { FlatList, Platform, SectionList, I18nManager } from 'react-native'
import Animated, { AnimatedRef, scrollTo } from 'react-native-reanimated'

import { RefComponent } from './types'

export const ONE_FRAME_MS = 16

export const { isRTL } = I18nManager

export const IS_IOS = Platform.OS === 'ios'

export const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

export const AnimatedSectionList = Animated.createAnimatedComponent(SectionList)

export function scrollToImpl<T extends RefComponent>(
  ref: AnimatedRef<T> | undefined,
  x: number,
  y: number,
  animated: boolean
): void {
  'worklet'
  if (!ref) return
  if (!Number.isFinite(x) || !Number.isFinite(y)) return

  scrollTo(ref, x, y, animated)
}
