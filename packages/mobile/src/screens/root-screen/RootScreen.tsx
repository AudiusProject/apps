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
  playerActions
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { PortalHost } from '@gorhom/portal'
import { useLinkTo } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import {
  getRouteOnCompletion,
  getStartedAndFinishedSignup,
  getStartedSignUpProcess,
  getWelcomeModalShown
} from 'common/store/pages/signon/selectors'
import { Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import useAppState from 'app/hooks/useAppState'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { useUpdateRequired } from 'app/hooks/useUpdateRequired'
import { SplashScreen } from 'app/screens/splash-screen'
import { enterBackground, enterForeground } from 'app/store/lifecycle/actions'

import { lazyScreenNamed } from 'app/utils/lazyScreen'

// Lazy load root-level screens
const AppDrawerScreen = lazyScreenNamed(
  () => import('../app-drawer-screen'),
  'AppDrawerScreen'
)
const ResetPasswordModalScreen = lazyScreenNamed(
  () => import('../reset-password-screen'),
  'ResetPasswordModalScreen'
)
const UpdateRequiredScreen = lazyScreenNamed(
  () => import('../update-required-screen'),
  'UpdateRequiredScreen'
)

// SignOnStack needs special handling since it's used as a render function with props
const SignOnStackLazy = lazyScreenNamed(
  () => import('../sign-on-screen'),
  'SignOnStack'
)

import { StatusBar } from './StatusBar'
import { useResetNotificationBadgeCount } from './useResetNotificationBadgeCount'

const { fetchMoreChats, fetchUnreadMessagesCount, connect, disconnect } =
  chatActions
const { reset } = playerActions
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
}

/**
 * The top level navigator. Switches between sign on screens and main tab navigator
 * based on if the user is authed
 */
export const RootScreen = () => {
  const { updateRequired } = useUpdateRequired()
  const dispatch = useDispatch()
  const { data: accountStatus } = useAccountStatus()
  const { data: hasCompleteAccount } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })

  const hasFinishedSignUp = useSelector(getStartedAndFinishedSignup)
  const showHomeStack = hasCompleteAccount && hasFinishedSignUp
  const startedSignUp = useSelector(getStartedSignUpProcess)
  const welcomeModalShown = useSelector(getWelcomeModalShown)
  const isAndroid = Platform.OS === MobileOS.ANDROID

  const [isLoaded, setIsLoaded] = useState(false)
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

  useEffect(() => {
    if (
      !isLoaded &&
      (accountStatus === Status.SUCCESS || accountStatus === Status.ERROR)
    ) {
      // Reset the player when the app is loaded for the first time. Fixes an issue
      // where after a crash, the player would persist the previous state. PAY-1412.
      dispatch(reset({ shouldAutoplay: false }))
      setIsLoaded(true)
    }
  }, [accountStatus, setIsLoaded, isLoaded, dispatch])

  // Connect to chats websockets and prefetch chats
  useEffect(() => {
    if (isLoaded && accountStatus === Status.SUCCESS) {
      dispatch(connect())
      dispatch(fetchMoreChats())
      dispatch(fetchUnreadMessagesCount())
      dispatch(startRecoveryIfNecessary())
    }
    return () => {
      dispatch(disconnect())
    }
  }, [dispatch, isLoaded, accountStatus])

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
        canDismiss={isLoaded}
        onDismiss={handleSplashScreenDismissed}
      />
      <StatusBar
        isAppLoaded={isLoaded}
        isSplashScreenDismissed={isSplashScreenDismissed}
      />
      {isLoaded ? (
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
                <SignOnStackLazy
                  isSplashScreenDismissed={isSplashScreenDismissed}
                />
              )}
            </Stack.Screen>
          )}
          <Stack.Screen
            name='ResetPassword'
            component={ResetPasswordModalScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name='TokenPicker' options={{ presentation: 'modal' }}>
            {() => <PortalHost name='TokenPickerPortal' />}
          </Stack.Screen>
        </Stack.Navigator>
      ) : null}
    </>
  )
}
