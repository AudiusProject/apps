import { useContext, useMemo } from 'react'

import { Gesture } from 'react-native-gesture-handler'

import { AppDrawerContext } from './AppDrawerContext'

// Rightward travel needed before the pan claims the touch.
const OPEN_DRAWER_ACTIVE_OFFSET_X = 20
// Vertical travel that rules the touch out as a drawer swipe. Together with
// the active offset this is an angle gate: the finger has to get 20pt right
// before it gets 12pt up or down (within ~30° of horizontal), so a vertical
// scroll that drifts sideways — however far, over however long a drag — fails
// the pan early and the list keeps the touch for good.
const OPEN_DRAWER_FAIL_OFFSET_Y = 12

/**
 * Direction-locked pan that opens the left nav drawer: rightward only, and
 * only when the drag is clearly horizontal. This is the app's drawer-opener
 * everywhere away from the screen edge. The drawer navigator's own pan can't
 * do this job full-screen — its thresholds are a hardcoded 5pt on both axes,
 * so it wins any touch that happens to move sideways first and cancels the
 * scroll underneath it.
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
