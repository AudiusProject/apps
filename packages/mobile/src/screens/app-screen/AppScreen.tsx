import { useCallback } from 'react'

import { MobileOS } from '@audius/common/models'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Platform } from 'react-native'

import { setLastNavAction } from 'app/hooks/useNavigation'

import { BuySellModalScreen } from '../buy-sell-screen'
import { ChangePasswordModalScreen } from '../change-password-screen'
import { CreateChatBlastNavigator } from '../create-chat-blast-screen/CreateChatBlastNavigator'
import { EditCollectionScreen } from '../edit-collection-screen'
import { EditTrackModalScreen } from '../edit-track-screen'
import { ExternalWalletsModalScreen } from '../external-wallets'
import { FeatureFlagOverrideScreen } from '../feature-flag-override-screen'
import { UploadModalScreen } from '../upload-screen'
import { VerificationWebViewModalScreen } from '../verification-webview-screen'

import { AppTabsScreen } from './AppTabsScreen'

const Stack = createNativeStackNavigator()

export const AppScreen = () => {
  /**
   * Reset lastNavAction on transitionEnd
   * Need to do this via screenListeners on the Navigator because listening
   * via navigation.addListener inside a screen does not always
   * catch events from other screens
   */
  const handleTransitionEnd = useCallback(() => {
    setLastNavAction(undefined)
  }, [])

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={{ transitionEnd: handleTransitionEnd }}
    >
      <Stack.Screen name='AppTabs' component={AppTabsScreen} />
      <Stack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
        <Stack.Screen name='Upload' component={UploadModalScreen} />
        <Stack.Screen name='BuySell' component={BuySellModalScreen} />
        <Stack.Screen
          name='EditTrack'
          component={EditTrackModalScreen}
          options={
            Platform.OS === MobileOS.ANDROID ? { animation: 'none' } : undefined
          }
        />
        <Stack.Screen name='EditCollection' component={EditCollectionScreen} />
        <Stack.Screen
          name='CreateChatBlast'
          component={CreateChatBlastNavigator}
        />
        <Stack.Screen
          name='ExternalWallets'
          component={ExternalWalletsModalScreen}
        />
        <Stack.Screen
          name='FeatureFlagOverride'
          component={FeatureFlagOverrideScreen}
        />
        <Stack.Screen
          name='ChangePassword'
          component={ChangePasswordModalScreen}
        />
        <Stack.Screen
          name='VerificationWebView'
          component={VerificationWebViewModalScreen}
        />
      </Stack.Group>
    </Stack.Navigator>
  )
}
