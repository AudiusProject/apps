import { useAccountStatus } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { NavigationBar, StatusBar as RNStatusBar } from 'react-native-bars'

import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

type ThemedStatusBarProps = {
  isAppLoaded: boolean
}

export const StatusBar = (props: ThemedStatusBarProps) => {
  const { isAppLoaded } = props
  const theme = useThemeVariant()
  const { data: accountStatus } = useAccountStatus()

  // Status & nav bar content (the android software buttons) should be light
  const shouldRenderLightContent = isDarkTheme(theme)

  const statusBarStyle = shouldRenderLightContent
    ? 'light-content'
    : 'dark-content'

  const onSignUpScreen = isAppLoaded && !(accountStatus === Status.SUCCESS)

  const navBarStyle =
    shouldRenderLightContent || onSignUpScreen
      ? 'light-content'
      : 'dark-content'

  return (
    <>
      <RNStatusBar barStyle={statusBarStyle} />
      <NavigationBar barStyle={navBarStyle} />
    </>
  )
}
