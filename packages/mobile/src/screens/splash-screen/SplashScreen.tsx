import { useEffect } from 'react'

import * as BootSplash from 'react-native-bootsplash'

/**
 * Assets for this splash screen are generated with
 * npx react-native-bootsplash generate \
 *  --background=#f7f7f8 \
 *  --logo-width=150 \
 *  --assets-output=src/assets/images
 *  src/assets/images/bootsplash_logo.svg
 */

type SplashScreenProps = {
  canDismiss: boolean
  onDismiss: () => void
}

export const SplashScreen = ({ canDismiss, onDismiss }: SplashScreenProps) => {
  useEffect(() => {
    if (canDismiss) {
      BootSplash.hide({ fade: true })
      onDismiss()
    }
  }, [canDismiss, onDismiss])

  return null
}
