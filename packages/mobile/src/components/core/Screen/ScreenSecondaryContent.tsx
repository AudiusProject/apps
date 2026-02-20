import type { ReactNode } from 'react'

import { Platform } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

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

  // Note: not animating on Android because shadows are rendered natively behind the
  // animated view and thus don't follow the animation.
  return isPrimaryContentReady ? (
    <Animated.View
      entering={Platform.OS === 'ios' ? FadeIn : undefined}
      style={{ flex: 1, minHeight: 0 }}
    >
      {children}
    </Animated.View>
  ) : (
    <>{skeleton ?? null}</>
  )
}
