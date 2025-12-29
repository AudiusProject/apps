import { useCallback } from 'react'

import { MobileOS } from '@audius/common/models'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Platform } from 'react-native'

import { setLastNavAction } from 'app/hooks/useNavigation'
import { lazyScreenNamed } from 'app/utils/lazyScreen'

import { AppTabsScreen } from './AppTabsScreen'

// Lazy load modal screens
const BuySellModalScreen = lazyScreenNamed(
  () => import('../buy-sell-screen'),
  'BuySellModalScreen'
)
const ChangePasswordModalScreen = lazyScreenNamed(
  () => import('../change-password-screen'),
  'ChangePasswordModalScreen'
)
const CreateChatBlastNavigator = lazyScreenNamed(
  () => import('../create-chat-blast-screen/CreateChatBlastNavigator'),
  'CreateChatBlastNavigator'
)
const EditCollectionScreen = lazyScreenNamed(
  () => import('../edit-collection-screen'),
  'EditCollectionScreen'
)
const EditTrackModalScreen = lazyScreenNamed(
  () => import('../edit-track-screen'),
  'EditTrackModalScreen'
)
const ExternalWalletsModalScreen = lazyScreenNamed(
  () => import('../external-wallets'),
  'ExternalWalletsModalScreen'
)
const FeatureFlagOverrideScreen = lazyScreenNamed(
  () => import('../feature-flag-override-screen'),
  'FeatureFlagOverrideScreen'
)
const TipArtistModalScreen = lazyScreenNamed(
  () => import('../tip-artist-screen'),
  'TipArtistModalScreen'
)
const UploadModalScreen = lazyScreenNamed(
  () => import('../upload-screen'),
  'UploadModalScreen'
)

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
        <Stack.Screen
          name='TipArtist'
          component={TipArtistModalScreen}
          // Drop animation on android to fix blank tip screen
          options={
            Platform.OS === MobileOS.ANDROID ? { animation: 'none' } : undefined
          }
        />
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
      </Stack.Group>
    </Stack.Navigator>
  )
}
