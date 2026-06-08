import type { ReactNode } from 'react'

import { useIsRestoring } from '@tanstack/react-query'
import { View } from 'react-native'

import { useScreenContext } from './ScreenContextProvider'

type ScreenSecondaryContentProps = {
  children: ReactNode
  skeleton?: ReactNode
}

/**
 * ScreenSecondaryContent is a wrapper that ensures the secondary content is only
 * rendered after any ScreenPrimaryContent within the same Screen component is ready
 *
 * _Note: ScreenSecondaryContent should not be used outside of a Screen component
 *   or in a Screen without a ScreenPrimaryContent_
 */
export const ScreenSecondaryContent = (props: ScreenSecondaryContentProps) => {
  const { children, skeleton } = props
  const { isPrimaryContentReady } = useScreenContext()
  // While PersistQueryClientProvider is hydrating from AsyncStorage, queries
  // are paused and return isPending:true. Keep showing the skeleton until the
  // cache snapshot is applied so the real content renders with actual data on
  // first paint.
  const isRestoring = useIsRestoring()

  const showReal = isPrimaryContentReady && !isRestoring

  // Keep the wrapper View always mounted so its flex:1 size is established on
  // the first frame. Previously we returned a bare fragment for the skeleton
  // phase and an Animated.View for the real phase; the Animated.View was
  // mounted fresh with a 0-height native frame, then Yoga expanded it to
  // flex:1 — the expansion animated as a "slide up" on iOS. A stable wrapper
  // avoids this entirely.
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {showReal ? children : (skeleton ?? null)}
    </View>
  )
}
