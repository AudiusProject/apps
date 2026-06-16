import type { ReactNode } from 'react'
import { useCallback, useEffect } from 'react'

import { Modal, StatusBar, StyleSheet, TouchableOpacity } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconClose } from '@audius/harmony-native'

// Distance (px) the user has to drag in any direction before the viewer
// dismisses on release. Velocity above the threshold also dismisses to allow
// a quick flick.
const DISMISS_DISTANCE_THRESHOLD = 120
const DISMISS_VELOCITY_THRESHOLD = 800
const SPRING_BACK_DURATION_MS = 200

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  }
})

type FullscreenImageViewerProps = {
  isOpen: boolean
  onClose: () => void
  /**
   * The image content to render centered on the black backdrop. Pan
   * translation is applied to the wrapper around this node, so each
   * specific viewer (avatar circle, cover-photo rectangle) just describes
   * the image shape and source.
   */
  children: ReactNode
  /**
   * Accessibility label for the close button. Defaults to "Close image
   * viewer"; callers can override (e.g. "Close avatar viewer").
   */
  closeAccessibilityLabel?: string
}

/**
 * Shared chrome for the profile-screen full-window image viewers. Wraps the
 * children in a black-backdrop Modal with fade-in/out animation, an X close
 * button anchored to the top-right safe-area inset, and a pan gesture that
 * translates the children with the finger and dismisses on a sufficient
 * drag distance or flick velocity in any direction.
 */
export const FullscreenImageViewer = ({
  isOpen,
  onClose,
  children,
  closeAccessibilityLabel = 'Close image viewer'
}: FullscreenImageViewerProps) => {
  const insets = useSafeAreaInsets()

  const translationX = useSharedValue(0)
  const translationY = useSharedValue(0)

  // Reset translation on every open — otherwise a partial drag that didn't
  // pass the dismiss threshold last time would leave the image off-center
  // when the user reopens the viewer.
  useEffect(() => {
    if (isOpen) {
      translationX.value = 0
      translationY.value = 0
    }
  }, [isOpen, translationX, translationY])

  const dismiss = useCallback(() => {
    onClose()
  }, [onClose])

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet'
      translationX.value = e.translationX
      translationY.value = e.translationY
    })
    .onEnd((e) => {
      'worklet'
      const distance = Math.sqrt(
        e.translationX * e.translationX + e.translationY * e.translationY
      )
      const speed = Math.sqrt(
        e.velocityX * e.velocityX + e.velocityY * e.velocityY
      )
      if (
        distance > DISMISS_DISTANCE_THRESHOLD ||
        speed > DISMISS_VELOCITY_THRESHOLD
      ) {
        runOnJS(dismiss)()
      } else {
        translationX.value = withTiming(0, {
          duration: SPRING_BACK_DURATION_MS
        })
        translationY.value = withTiming(0, {
          duration: SPRING_BACK_DURATION_MS
        })
      }
    })

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value }
    ]
  }))

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle='light-content'
        backgroundColor='#000'
        translucent={false}
      />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.backdrop}>
          <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
            {children}
          </Animated.View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel={closeAccessibilityLabel}
            accessibilityRole='button'
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            style={[styles.closeButton, { top: insets.top + 8 }]}
          >
            <IconClose color='staticWhite' size='l' />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </Modal>
  )
}
