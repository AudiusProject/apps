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

  // Skip the iOS FadeIn entrance when a skeleton is provided — the skeleton
  // is the visual placeholder, so fading the swap-in causes a brief flash
  // through opacity 0. Keep the FadeIn for the no-skeleton case where the
  // children are appearing from nothing.
  // Android: not animated because shadows render natively behind the
  // animated view and don't follow the animation.
  const shouldFadeIn = Platform.OS === 'ios' && !skeleton

  return isPrimaryContentReady ? (
    <Animated.View
      entering={shouldFadeIn ? FadeIn : undefined}
      style={{ flex: 1, minHeight: 0 }}
    >
      {children}
    </Animated.View>
  ) : (
    <>{skeleton ?? null}</>
  )
}
