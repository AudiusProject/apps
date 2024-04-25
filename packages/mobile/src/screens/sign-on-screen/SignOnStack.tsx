import { useCallback, useState } from 'react'

import { MobileOS } from '@audius/common/models'
import { accountSelectors } from '@audius/common/store'
import { getSignOn } from '@audius/web/src/common/store/pages/signon/selectors'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Platform } from 'react-native'
import { useSelector } from 'react-redux'

import { ScreenOptionsContext, defaultScreenOptions } from 'app/app/navigation'

import { AccountLoadingScreen } from './screens/AccountLoadingScreen'
import { ConfirmEmailScreen } from './screens/ConfirmEmailScreen'
import { CreateLoginDetailsScreen } from './screens/CreateLoginDetailsScreen'
import { CreatePasswordScreen } from './screens/CreatePasswordScreen'
import { FinishProfileScreen } from './screens/FinishProfileScreen'
import { PickHandleScreen } from './screens/PickHandleScreen'
import { ReviewHandleScreen } from './screens/ReviewHandleScreen'
import { SelectArtistsScreen } from './screens/SelectArtistScreen'
import { SelectGenresScreen } from './screens/SelectGenresScreen'
import { SignOnScreen } from './screens/SignOnScreen'
const { getAccountUser } = accountSelectors

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

  const signUpState = useSelector(getSignOn)
  const user = useSelector(getAccountUser)
  const hasAccount = !!user

  const pastPhase1 = signUpState.finishedPhase1 || hasAccount

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
              name='CreateLoginDetails'
              component={CreateLoginDetailsScreen}
            />
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
