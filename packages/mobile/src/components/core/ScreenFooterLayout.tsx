import type { ReactNode } from 'react'

import { useHeaderHeight } from '@react-navigation/elements'
import { StyleSheet, View } from 'react-native'
import {
  KeyboardAvoidingView,
  useReanimatedKeyboardAnimation
} from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Paper } from '@audius/harmony-native'

import { useBottomBarInset } from './BottomBarInsetContext'

type ScreenFooterLayoutProps = {
  children: ReactNode
  footer: ReactNode
}

/** A bounded scroll area followed by actions, with navigation clearance applied once. */
export const ScreenFooterLayout = ({
  children,
  footer
}: ScreenFooterLayoutProps) => {
  const headerHeight = useHeaderHeight()
  const bottomBarInset = useBottomBarInset()
  const insets = useSafeAreaInsets()
  const { height } = useReanimatedKeyboardAnimation()
  const bottomInset = bottomBarInset || insets.bottom
  // The keyboard replaces the bottom navigation area instead of adding to it.
  const clearanceStyle = useAnimatedStyle(
    () => ({
      height: Math.max(0, bottomInset + height.value)
    }),
    [bottomInset]
  )

  return (
    <KeyboardAvoidingView
      behavior='height'
      keyboardVerticalOffset={headerHeight}
      style={styles.root}
    >
      <View style={styles.content}>{children}</View>
      <Paper
        p='l'
        borderTop='default'
        shadow='midInverted'
        style={styles.footer}
      >
        {footer}
      </Paper>
      <Animated.View pointerEvents='none' style={clearanceStyle} />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
  footer: { flexShrink: 0, borderRadius: 0 }
})
