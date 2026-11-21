import { useContext, useMemo } from 'react'

import { Gesture } from 'react-native-gesture-handler'

import { AppDrawerContext } from './AppDrawerContext'

const OPEN_DRAWER_ACTIVE_OFFSET_X = 20
const OPEN_DRAWER_FAIL_OFFSET_Y = 12

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
