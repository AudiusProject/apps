import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentAccountUser,
  selectIsAccountComplete,
  useAccountStatus
} from '@audius/common/api'
import { MobileOS, Status } from '@audius/common/models'
import {
  buyUSDCActions,
  chatActions,
  playbackActions
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { PortalHost } from '@gorhom/portal'
import { useLinkTo } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useIsRestoring } from '@tanstack/react-query'
import {
  getRouteOnCompletion,
  getStartedAndFinishedSignup,
  getStartedSignUpProcess,
  getWelcomeModalShown
} from 'common/store/pages/signon/selectors'
import { Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useEffectOnce } from 'react-use'

import { useActivityPing } from 'app/hooks/useActivityPing'
import useAppState from 'app/hooks/useAppState'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { usePrefetchTrendingImages } from 'app/hooks/usePrefetchTrendingImages'
import { useUpdateRequired } from 'app/hooks/useUpdateRequired'
import { SplashScreen } from 'app/screens/splash-screen'
import { UpdateRequiredScreen } from 'app/screens/update-required-screen'
import { enterBackground, enterForeground } from 'app/store/lifecycle/actions'

import { AppDrawerScreen } from '../app-drawer-screen'
import { OAuthScreen } from '../oauth-screen/OAuthScreen'
import { ResetPasswordModalScreen } from '../reset-password-screen'
import { SignOnStack } from '../sign-on-screen'

import { StatusBar } from './StatusBar'
import { useResetNotificationBadgeCount } from './useResetNotificationBadgeCount'

const { fetchMoreChats, fetchUnreadMessagesCount, connect, disconnect } =
  chatActions
const { reset } = playbackActions
const { startRecoveryIfNecessary } = buyUSDCActions
const { FEED_PAGE } = route

const Stack = createNativeStackNavigator()

export type RootScreenParamList = {
  UpdateStack: undefined
  HomeStack: undefined
  SignUp: undefined
  SignIn: undefined
  SignOnStack: undefined
  ResetPassword: { login: string; email: string }
  OAuthScreen: { search: string }
}

/**
 * The top level navigator. Switches between sign on screens and main tab navigator
 * based on if the user is authed
 */
export const RootScreen = () => {
  const { updateRequired } = useUpdateRequired()
  const dispatch = useDispatch()
  // Keep the native splash up until the query-client cache is fully restored
  // from AsyncStorage. The skeleton→real content swap happens under the splash,
  // so the user never sees the brief layout settling that caused a visible
  // "slide down/up" glitch on content load.
  const isRestoring = useIsRestoring()
  usePrefetchTrendingImages()
  const { data: accountStatus } = useAccountStatus()
  const { data: hasCompleteAccount } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })

  const hasFinishedSignUp = useSelector(getStartedAndFinishedSignup)
  const showHomeStack = hasCompleteAccount && hasFinishedSignUp
  const startedSignUp = useSelector(getStartedSignUpProcess)
  const welcomeModalShown = useSelector(getWelcomeModalShown)
  const isAndroid = Platform.OS === MobileOS.ANDROID

  const [isSplashScreenDismissed, setIsSplashScreenDismissed] = useState(false)
  const { navigate } = useNavigation()
  const { onOpen: openWelcomeDrawer } = useDrawer('Welcome')
  const routeOnCompletion = useSelector(getRouteOnCompletion)
  const linkTo = useLinkTo()

  useAppState(
    () => dispatch(enterForeground()),
    () => dispatch(enterBackground())
  )

  useResetNotificationBadgeCount()
  useActivityPing()

  // Reset the player on first mount so a crash doesn't leak previous playback
  // state into the next session. PAY-1412.
  useEffectOnce(() => {
    dispatch(reset({ shouldAutoplay: false }))
  })

  // Connect to chats once the server confirms the account.
  useEffect(() => {
    if (accountStatus === Status.SUCCESS) {
      dispatch(connect())
      dispatch(fetchMoreChats())
      dispatch(fetchUnreadMessagesCount())
      dispatch(startRecoveryIfNecessary())
    }
    return () => {
      dispatch(disconnect())
    }
  }, [dispatch, accountStatus])

  const handleSplashScreenDismissed = useCallback(() => {
    setIsSplashScreenDismissed(true)
  }, [])

  useEffect(() => {
    if (showHomeStack && startedSignUp && !welcomeModalShown) {
      openWelcomeDrawer()
      // On iOS this will auto-navigate when we un-render sign up but on Android we have to navigate intentionally
      if (isAndroid && navigate) {
        navigate('HomeStack')
      }
    }
    if (showHomeStack && routeOnCompletion && routeOnCompletion !== FEED_PAGE) {
      // Route to the original deep link after user signs up
      linkTo(routeOnCompletion)
    }
  }, [
    openWelcomeDrawer,
    showHomeStack,
    startedSignUp,
    welcomeModalShown,
    navigate,
    isAndroid,
    routeOnCompletion,
    linkTo
  ])

  return (
    <>
      <SplashScreen
        canDismiss={!isRestoring}
        onDismiss={handleSplashScreenDismissed}
      />
      <StatusBar isAppLoaded />
      <Stack.Navigator
        screenOptions={{ gestureEnabled: false, headerShown: false }}
      >
        {updateRequired ? (
          <Stack.Screen name='UpdateStack' component={UpdateRequiredScreen} />
        ) : null}

        {showHomeStack ? (
          <Stack.Screen
            name='HomeStack'
            component={AppDrawerScreen}
            // animation: none here is a workaround to prevent "white screen of death" on Android
            options={isAndroid ? { animation: 'none' } : undefined}
          />
        ) : (
          <Stack.Screen name='SignOnStack'>
            {() => (
              <SignOnStack isSplashScreenDismissed={isSplashScreenDismissed} />
            )}
          </Stack.Screen>
        )}
        <Stack.Screen
          name='ResetPassword'
          component={ResetPasswordModalScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name='OAuthScreen'
          component={OAuthScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name='TokenPicker' options={{ presentation: 'modal' }}>
          {() => <PortalHost name='TokenPickerPortal' />}
        </Stack.Screen>
      </Stack.Navigator>
    </>
  )
}
