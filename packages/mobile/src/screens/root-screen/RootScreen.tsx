import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentAccountUser,
  selectIsAccountComplete,
  useAccountStatus
} from '@audius/common/api'
import { MobileOS, Status } from '@audius/common/models'
import { chatActions, playbackActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { PortalHost } from '@gorhom/portal'
import type { NavigatorScreenParams } from '@react-navigation/native'
import { useLinkTo } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useIsRestoring } from '@tanstack/react-query'
import {
  getRouteOnCompletion,
  getStartedAndFinishedSignup,
  getStartedSignUpProcess,
  getWelcomeModalShown
} from 'common/store/pages/signon/selectors'
import { InteractionManager, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useEffectOnce } from 'react-use'

import { useManagedAccountAccessCheck } from 'app/components/manager-mode/useManagedAccountAccessCheck'
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
import type { SignOnScreenParamList } from '../sign-on-screen/types'

import { StatusBar } from './StatusBar'
import { useResetNotificationBadgeCount } from './useResetNotificationBadgeCount'

const { fetchMoreChats, fetchUnreadMessagesCount, connect, disconnect } =
  chatActions
const { reset } = playbackActions
const { FEED_PAGE } = route

const Stack = createNativeStackNavigator()

const STARTUP_DEFER_MAX_MS = 3000

const runAfterStartup = (fn: () => void) => {
  let done = false
  const run = () => {
    if (done) return
    done = true
    clearTimeout(timeout)
    task.cancel()
    fn()
  }
  const timeout = setTimeout(run, STARTUP_DEFER_MAX_MS)
  const task = InteractionManager.runAfterInteractions(run)
  return () => {
    done = true
    clearTimeout(timeout)
    task.cancel()
  }
}

export type RootScreenParamList = {
  UpdateStack: undefined
  HomeStack: undefined
  SignUp: undefined
  SignIn: undefined
  SignOnStack: NavigatorScreenParams<SignOnScreenParamList> | undefined
  ResetPassword: { login: string; email: string }
  OAuthScreen: { search: string }
}

export const RootScreen = () => {
  const { updateRequired } = useUpdateRequired()
  const dispatch = useDispatch()
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
  useManagedAccountAccessCheck()

  useEffectOnce(() => {
    dispatch(reset({ shouldAutoplay: false }))
  })

  useEffect(() => {
    let cancelConnect: (() => void) | undefined
    if (accountStatus === Status.SUCCESS) {
      cancelConnect = runAfterStartup(() => {
        dispatch(connect())
        dispatch(fetchMoreChats())
      })
      dispatch(fetchUnreadMessagesCount())
    }
    return () => {
      cancelConnect?.()
      dispatch(disconnect())
    }
  }, [dispatch, accountStatus])

  const handleSplashScreenDismissed = useCallback(() => {
    setIsSplashScreenDismissed(true)
  }, [])

  useEffect(() => {
    if (showHomeStack && startedSignUp && !welcomeModalShown) {
      openWelcomeDrawer()
      if (isAndroid && navigate) {
        navigate('HomeStack')
      }
    }
    if (showHomeStack && routeOnCompletion && routeOnCompletion !== FEED_PAGE) {
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
          <Stack.Screen
            name='UpdateStack'
            getComponent={() => UpdateRequiredScreen}
          />
        ) : null}

        {showHomeStack ? (
          <Stack.Screen
            name='HomeStack'
            component={AppDrawerScreen}
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
          getComponent={() => ResetPasswordModalScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name='OAuthScreen'
          getComponent={() => OAuthScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name='TokenPicker' options={{ presentation: 'modal' }}>
          {() => <PortalHost name='TokenPickerPortal' />}
        </Stack.Screen>
      </Stack.Navigator>
    </>
  )
}
