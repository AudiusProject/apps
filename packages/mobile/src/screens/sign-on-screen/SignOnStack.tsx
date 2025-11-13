import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentAccountUser,
  selectIsAccountComplete
} from '@audius/common/api'
import { MobileOS } from '@audius/common/models'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import {
  getFinishedPhase1,
  getPage,
  getStartedAndFinishedSignup
} from 'common/store/pages/signon/selectors'
import { Pages } from 'common/store/pages/signon/types'
import { Platform } from 'react-native'
import { useSelector } from 'react-redux'

import { ScreenOptionsContext, defaultScreenOptions } from 'app/app/navigation'
import { useNavigation } from 'app/hooks/useNavigation'

import { AccountLoadingScreen } from './screens/AccountLoadingScreen'
import { ConfirmEmailScreen } from './screens/ConfirmEmailScreen'
import { CreatePasswordScreen } from './screens/CreatePasswordScreen'
import { FinishProfileScreen } from './screens/FinishProfileScreen'
import { PickHandleScreen } from './screens/PickHandleScreen'
import { ReviewHandleScreen } from './screens/ReviewHandleScreen'
import { SelectArtistsScreen } from './screens/SelectArtistScreen'
import { SelectGenresScreen } from './screens/SelectGenresScreen'
import { SignOnScreen } from './screens/SignOnScreen'
import type { SignOnScreenParamList } from './types'

const Stack = createNativeStackNavigator()
const screenOptionsOverrides = { animationTypeForReplace: 'pop' as const }

type SignOnStackProps = {
  isSplashScreenDismissed: boolean
}

export const SignOnStack = (props: SignOnStackProps) => {
  const { isSplashScreenDismissed } = props
  const [screenOptions, setScreenOptions] =
    useState<NativeStackNavigationOptions>({
      ...defaultScreenOptions,
      ...screenOptionsOverrides
    })

  const finishedPhase1 = useSelector(getFinishedPhase1)
  const { data: hasCompleteAccount } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })
  const hasFinishedSignUp = useSelector(getStartedAndFinishedSignup)
  const hasCompletedAccount = hasCompleteAccount && hasFinishedSignUp

  const pastPhase1 = finishedPhase1 || hasCompletedAccount

  const isAndroid = Platform.OS === MobileOS.ANDROID

  const updateOptions = useCallback(
    (newOptions: NativeStackNavigationOptions) => {
      setScreenOptions({
        ...defaultScreenOptions,
        ...screenOptionsOverrides,
        gestureEnabled: false,
        ...newOptions
      })
    },
    []
  )

  const page = useSelector(getPage)
  const navigation = useNavigation<SignOnScreenParamList>()

  // Respond to signon saga page changes
  useEffect(() => {
    // This occurs when a guest account confirms email and is ready to complete their account
    if (page === Pages.PASSWORD) {
      navigation.navigate('CreatePassword')
    }
  }, [navigation, page])

  return (
    <ScreenOptionsContext.Provider
      value={{ options: screenOptions, updateOptions }}
    >
      <Stack.Navigator initialRouteName='SignOn' screenOptions={screenOptions}>
        {!pastPhase1 ? (
          <Stack.Group>
            <Stack.Screen name='SignOn' options={{ headerShown: false }}>
              {() => (
                <SignOnScreen
                  isSplashScreenDismissed={isSplashScreenDismissed}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name='ConfirmEmail' component={ConfirmEmailScreen} />
            <Stack.Screen
              name='CreatePassword'
              component={CreatePasswordScreen}
            />
            <Stack.Screen name='PickHandle' component={PickHandleScreen} />
            <Stack.Screen name='ReviewHandle' component={ReviewHandleScreen} />
            <Stack.Screen
              name='FinishProfile'
              component={FinishProfileScreen}
            />
          </Stack.Group>
        ) : undefined}
        <Stack.Screen
          name='SelectGenre'
          component={SelectGenresScreen}
          options={{
            headerLeft: () => null,
            gestureEnabled: false,
            ...(isAndroid ? { animation: 'none' } : undefined)
          }}
        />
        <Stack.Screen name='SelectArtists' component={SelectArtistsScreen} />
        <Stack.Screen
          name='AccountLoading'
          component={AccountLoadingScreen}
          // animation: none here is a workaround to prevent "white screen of death" on Android
          options={{
            headerShown: false,
            ...(isAndroid ? { animation: 'none' } : undefined)
          }}
        />
      </Stack.Navigator>
    </ScreenOptionsContext.Provider>
  )
}
