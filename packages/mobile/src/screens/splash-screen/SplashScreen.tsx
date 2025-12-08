import { useState, useRef } from 'react'

import { Animated, Image, Platform } from 'react-native'
import * as BootSplash from 'react-native-bootsplash'
import { useAsync } from 'react-use'

/**
 * Assets for this splash screen are generated with
 * npx react-native-bootsplash generate \
 *  --background=#7E1BCC \
 *  --logo-width=150 \
 *  --assets-output=src/assets/images
 *  src/assets/images/bootsplash_logo.svg
 */

// Extra larger render width so when we scale it up,
// resolution is maintained.
const RENDER_WIDTH = 1000
const START_SIZE = 0.15
const END_SIZE = 1

type SplashScreenProps = {
  canDismiss: boolean
  onDismiss: () => void
}

export const SplashScreen = (props: SplashScreenProps) => {
  return Platform.OS === 'ios' ? (
    <IosSplashScreen {...props} />
  ) : (
    <AndroidSplashScreen {...props} />
  )
}

const IosSplashScreen = (props: SplashScreenProps) => {
  const { canDismiss, onDismiss } = props
  const opacity = useRef(new Animated.Value(1)).current
  const scale = useRef(new Animated.Value(START_SIZE)).current
  const [isShowing, setIsShowing] = useState(true)

  // useHideAnimation requires logo source and proper usage of returned props
  const { container, logo } = BootSplash.useHideAnimation({
    ready: canDismiss,
    manifest: require('../../assets/images/manifest.json'),
    logo: require('../../assets/images/logo.png'), // Provide logo source
    animate: () => {
      // This is called after the native splash is hidden
      Animated.spring(scale, {
        useNativeDriver: true,
        tension: 10,
        friction: 200,
        toValue: START_SIZE * 0.8
      }).start(() => {
        onDismiss()
        Animated.parallel([
          Animated.spring(scale, {
            useNativeDriver: true,
            tension: 100,
            friction: 50,
            toValue: END_SIZE
          }),
          Animated.spring(opacity, {
            useNativeDriver: true,
            tension: 100,
            friction: 50,
            toValue: 0
          })
        ]).start(() => {
          setIsShowing(false)
        })
      })
    }
  })

  return isShowing ? (
    <Animated.View {...container} style={[container.style, { opacity }]}>
      <Animated.View
        style={[
          {
            width: RENDER_WIDTH,
            height: (125 / 150) * RENDER_WIDTH, // Maintain aspect ratio
            transform: [{ scaleX: scale }, { scaleY: scale }],
            alignItems: 'center',
            justifyContent: 'center'
          }
        ]}
      >
        {/* Use the logo from useHideAnimation - it handles sizing and loading */}
        <Image {...logo} />
      </Animated.View>
    </Animated.View>
  ) : null
}

const AndroidSplashScreen = (props: SplashScreenProps) => {
  const { canDismiss, onDismiss } = props

  // Android does not use the SplashScreen component as different
  // devices will render different sizes of the BootSplash.
  // Instead of our custom SplashScreen, fade out the BootSplash screen.
  useAsync(async () => {
    if (canDismiss) {
      await BootSplash.hide({ fade: true })
      onDismiss()
    }
  }, [canDismiss])

  return null
}
