import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { isLiquidGlassAvailable } from 'app/components/core/Screen/LiquidGlass'

import {
  BOTTOM_BAR_HEIGHT,
  FLOATING_BAR_HEIGHT,
  FLOATING_BAR_TOP_GAP
} from './constants'

/**
 * Where the floating pill sits, or null when the classic full-width bar should
 * render instead.
 *
 * The pill only floats on devices with a home indicator. Home-button devices
 * have no bottom inset to sink it into, so it would need more room than
 * BOTTOM_BAR_HEIGHT gives it.
 */
export const useFloatingTabBar = () => {
  const { bottom } = useSafeAreaInsets()
  const pillBottom =
    BOTTOM_BAR_HEIGHT + bottom - FLOATING_BAR_HEIGHT - FLOATING_BAR_TOP_GAP
  if (!isLiquidGlassAvailable || pillBottom < 8) return null
  return { pillBottom }
}
