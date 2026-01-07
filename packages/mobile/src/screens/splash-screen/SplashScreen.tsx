import { useEffect } from 'react'

import * as BootSplash from 'react-native-bootsplash'

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
