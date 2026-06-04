import { useCallback, useEffect } from 'react'

import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import {
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconClose } from '@audius/harmony-native'
import { useProfilePicture } from 'app/components/image/UserImage'

// Distance (px) the user has to drag in any direction before the viewer
// dismisses on release. Velocity above the threshold also dismisses to
// allow a quick flick.
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
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    width: '100%',
    height: '100%'
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

type AvatarViewerProps = {
  userId: ID | null | undefined
  isOpen: boolean
  onClose: () => void
}

/**
 * Full-screen avatar viewer for the profile screen. Shows the user's profile
 * picture at the largest cached size on a black backdrop with an X button in
 * the top-right. Any swipe gesture (up, down, left, or right) past a small
 * distance / velocity threshold dismisses it; smaller drags spring back.
 */
export const AvatarViewer = ({ userId, isOpen, onClose }: AvatarViewerProps) => {
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()

  // Use the largest cached size the image API serves so the full-screen
  // render isn't a blurry upscale of the 150-px tile shown in the header.
  const { source } = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  const translationX = useSharedValue(0)
  const translationY = useSharedValue(0)

  // Reset the translation any time the viewer opens — without this a partial
  // drag from a previous open lingers and the next open starts off-center.
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
            <Image
              source={source}
              style={[styles.image, { maxWidth: windowWidth }]}
              resizeMode='contain'
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel='Close avatar viewer'
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
