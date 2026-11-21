import { useCallback } from 'react'

import { MobileOS } from '@audius/common/models'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Platform } from 'react-native'

import { setLastNavAction } from 'app/hooks/useNavigation'

import { BuySellModalScreen } from '../buy-sell-screen'
import { ChangeEmailModalScreen } from '../change-email-screen/ChangeEmailScreen'
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
        <Stack.Screen name='Upload' getComponent={() => UploadModalScreen} />
        <Stack.Screen name='BuySell' getComponent={() => BuySellModalScreen} />
        <Stack.Screen
          name='EditTrack'
          getComponent={() => EditTrackModalScreen}
          options={
            Platform.OS === MobileOS.ANDROID ? { animation: 'none' } : undefined
          }
        />
        <Stack.Screen
          name='EditCollection'
          getComponent={() => EditCollectionScreen}
        />
        <Stack.Screen
          name='CreateChatBlast'
          getComponent={() => CreateChatBlastNavigator}
        />
        <Stack.Screen
          name='ExternalWallets'
          getComponent={() => ExternalWalletsModalScreen}
        />
        <Stack.Screen
          name='FeatureFlagOverride'
          getComponent={() => FeatureFlagOverrideScreen}
        />
        <Stack.Screen
          name='ChangeEmail'
          getComponent={() => ChangeEmailModalScreen}
        />
        <Stack.Screen
          name='ChangePassword'
          getComponent={() => ChangePasswordModalScreen}
        />
        <Stack.Screen
          name='VerificationWebView'
          getComponent={() => VerificationWebViewModalScreen}
        />
      </Stack.Group>
    </Stack.Navigator>
  )
}
