import { useAccountStatus } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { NavigationBar, StatusBar as RNStatusBar } from 'react-native-bars'

import { Theme, useThemeVariant } from 'app/utils/theme'

type ThemedStatusBarProps = {
  isAppLoaded: boolean
  isSplashScreenDismissed: boolean
}

export const StatusBar = (props: ThemedStatusBarProps) => {
  const { isAppLoaded, isSplashScreenDismissed } = props
  const theme = useThemeVariant()
  const { data: accountStatus } = useAccountStatus()

  // Status & nav bar content (the android software buttons) should be light
  // while in a dark theme or the splash screen is still visible
  // (it's purple and white-on-purple looks better)
  const shouldRenderLightContent =
    theme === Theme.DARK || theme === Theme.MATRIX || !isSplashScreenDismissed

  const statusBarStyle = shouldRenderLightContent
    ? 'light-content'
    : 'dark-content'

  const onSignUpScreen = isAppLoaded && !(accountStatus === Status.SUCCESS)

  const navBarStyle =
    shouldRenderLightContent || onSignUpScreen
      ? 'light-content'
      : 'dark-content'

  // Wait until splash screen in dismissed before rendering statusbar
  // if (!isSplashScreenDismissed) return null

  return (
    <>
      <RNStatusBar barStyle={statusBarStyle} />
      <NavigationBar barStyle={navBarStyle} />
    </>
  )
}
