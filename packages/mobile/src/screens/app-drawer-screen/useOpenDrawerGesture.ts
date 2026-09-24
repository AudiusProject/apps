import { useContext, useMemo } from 'react'

import { Gesture } from 'react-native-gesture-handler'

import { AppDrawerContext } from './AppDrawerContext'

// Rightward travel needed before the pan claims the touch.
const OPEN_DRAWER_ACTIVE_OFFSET_X = 20
// Fail on 12pt of vertical travel, so only drags within ~30 degrees of
// horizontal open the drawer.
const OPEN_DRAWER_FAIL_OFFSET_Y = 12

/**
 * Rightward, mostly horizontal pan that opens the left nav drawer from
 * mid-screen. The drawer navigator's own pan has fixed 5pt thresholds, so it
 * is limited to the screen edge.
 */
export const useOpenDrawerGesture = (enabled: boolean) => {
  const { drawerHelpers } = useContext(AppDrawerContext)

  return useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX(OPEN_DRAWER_ACTIVE_OFFSET_X)
        .failOffsetX(-OPEN_DRAWER_ACTIVE_OFFSET_X)
        .failOffsetY([-OPEN_DRAWER_FAIL_OFFSET_Y, OPEN_DRAWER_FAIL_OFFSET_Y])
        .runOnJS(true)
        .onStart(() => {
          drawerHelpers?.openDrawer()
        }),
    [enabled, drawerHelpers]
  )
}
