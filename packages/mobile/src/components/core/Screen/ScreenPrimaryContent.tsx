import { useEffect, type ReactNode } from 'react'

import { Platform } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { useScreenContext } from './ScreenContextProvider'

type ScreenPrimaryContentProps = {
  children: ReactNode
  skeleton?: ReactNode
}

export const ScreenPrimaryContent = (props: ScreenPrimaryContentProps) => {
  const { children, skeleton } = props
  const { isScreenReady, setIsPrimaryContentReady } = useScreenContext()
  useEffect(() => {
    if (!isScreenReady) return
    setIsPrimaryContentReady(true)
  }, [isScreenReady, setIsPrimaryContentReady])

  const screenContent =
    skeleton || Platform.OS === 'ios' ? (
      children
    ) : (
      <Animated.View entering={FadeIn}>{children}</Animated.View>
    )

  return <>{isScreenReady ? screenContent : (skeleton ?? null)}</>
}
