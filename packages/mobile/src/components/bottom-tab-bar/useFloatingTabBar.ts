import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { isLiquidGlassAvailable } from 'app/components/core/Screen/LiquidGlass'

import {
  BOTTOM_BAR_HEIGHT,
  FLOATING_BAR_HEIGHT,
  FLOATING_BAR_TOP_GAP
} from './constants'

export const useFloatingTabBar = () => {
  const { bottom } = useSafeAreaInsets()
  const pillBottom =
    BOTTOM_BAR_HEIGHT + bottom - FLOATING_BAR_HEIGHT - FLOATING_BAR_TOP_GAP
  if (!isLiquidGlassAvailable || pillBottom < 8) return null
  return { pillBottom }
}
