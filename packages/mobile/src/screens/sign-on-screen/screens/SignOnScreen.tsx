import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { css } from '@emotion/native'
import type { RouteProp } from '@react-navigation/native'
import { useRoute } from '@react-navigation/native'
import {
  setField,
  updateRouteOnCompletion,
  setValueField
} from 'common/store/pages/signon/actions'
import { useDarkMode } from 'react-native-dynamic'
import { ImageBackground, Pressable, SafeAreaView } from 'react-native'
import Animated, {
  CurvedTransition,
  FadeIn,
  FadeOut,
  SlideInUp
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePrevious } from 'react-use'

import {
  Flex,
  IconAudiusLogoHorizontalNew,
  IconCloseAlt,
  Paper,
  Text,
  TextLink,
  ThemeProvider as HarmonyThemeProvider,
  useTheme
} from '@audius/harmony-native'
import DJBackground from 'app/assets/images/DJportrait.jpg'
import type { NonLinkProps } from 'app/harmony-native/components/TextLink/types'
import { dispatch } from 'app/store'

import { AudiusValues } from '../components/AudiusValues'
import { PANEL_EXPAND_DURATION } from '../constants'
import type { SignOnScreenParamList } from '../types'

import { CreateEmailScreen } from './CreateEmailScreen'
import { SignInScreen } from './SignInScreen'
import type { SignOnScreenType } from './types'

const messages = {
  newToAudius: 'New to Audius?',
  createAccount: 'Create an Account'
}

const AnimatedPaper = Animated.createAnimatedComponent(Paper)
const AnimatedFlex = Animated.createAnimatedComponent(Flex)

const CreateAccountLink = (props: NonLinkProps) => {
  const { onPress } = props
  const { spacing } = useTheme()

  return (
    <AnimatedFlex
      alignItems='center'
      justifyContent='flex-end'
      style={css({ flexGrow: 1 })}
      entering={FadeIn}
      exiting={FadeOut}
    >
      <SafeAreaView style={{ paddingBottom: spacing['3xl'] }}>
        <Text
          variant='title'
          strength='weak'
          textAlign='center'
          color='inverse'
          style={{ justifyContent: 'flex-end' }}
        >
          {messages.newToAudius}{' '}
          <TextLink showUnderline onPress={onPress}>
            {messages.createAccount}
          </TextLink>
        </Text>
      </SafeAreaView>
    </AnimatedFlex>
  )
}

const BACKGROUND_OVERLAY_OPACITY = 0.4

const Background = () => {
  return (
    <Flex
      h='100%'
      w='100%'
      style={css({
        position: 'absolute',
        top: 0,
        left: 0
      })}
    >
      <ImageBackground
        source={DJBackground}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0
        }}
        resizeMode='cover'
      />
      <Flex
        style={css({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: `rgba(0, 0, 0, ${BACKGROUND_OVERLAY_OPACITY})`
        })}
      />
    </Flex>
  )
}

const NAV_LOGO_HEIGHT = 32
const NAV_LOGO_WIDTH = 157
const NAV_CLOSE_SIZE = 32

const SignOnOverlayNav = () => {
  const insets = useSafeAreaInsets()
  const { spacing } = useTheme()
  return (
    <Flex
      flexDirection='row'
      justifyContent='space-between'
      alignItems='center'
      style={css({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.m,
        zIndex: 1
      })}
    >
      <Pressable hitSlop={12}>
        <IconCloseAlt
          width={NAV_CLOSE_SIZE}
          height={NAV_CLOSE_SIZE}
          color='white'
        />
      </Pressable>
      <IconAudiusLogoHorizontalNew
        width={NAV_LOGO_WIDTH}
        height={NAV_LOGO_HEIGHT}
        color='white'
      />
    </Flex>
  )
}

type ExpandablePanelProps = {
  children: ReactNode
}

const ExpandablePanel = (props: ExpandablePanelProps) => {
  const { children } = props
  const insets = useSafeAreaInsets()
  const { cornerRadius } = useTheme()
  return (
    <AnimatedPaper
      entering={SlideInUp.duration(PANEL_EXPAND_DURATION)}
      layout={CurvedTransition}
      style={css({
        overflow: 'hidden',
        paddingTop: insets.top,
        borderBottomLeftRadius: cornerRadius['3xl'],
        borderBottomRightRadius: cornerRadius['3xl']
      })}
    >
      <Flex gap='2xl' ph='l' pv='2xl'>
        {children}
      </Flex>
    </AnimatedPaper>
  )
}

export type SignOnScreenParams = {
  screen: SignOnScreenType
  guestEmail?: string
  routeOnCompletion?: string
}

type SignOnScreenProps = {
  isSplashScreenDismissed: boolean
}

/*
 * Manages the container for sign-up and sign-in flow
 * Not using navigation for this due to transition between sign-in and sign-up
 */
export const SignOnScreen = (props: SignOnScreenProps) => {
  const { isSplashScreenDismissed } = props
  const { params } = useRoute<RouteProp<SignOnScreenParamList, 'SignOn'>>()
  const {
    screen: screenParam = 'sign-up',
    guestEmail,
    routeOnCompletion
  } = params ?? {}
  const [screen, setScreen] = useState<SignOnScreenType>(screenParam)
  const previousScreen = usePrevious(screen)

  useEffect(() => {
    if (guestEmail) {
      dispatch(setValueField('email', guestEmail))
      dispatch(setField('isGuest', true))
    }

    if (routeOnCompletion) {
      dispatch(updateRouteOnCompletion(routeOnCompletion))
    }

    setScreen(screenParam)
  }, [guestEmail, routeOnCompletion, screenParam])

  const isDarkMode = useDarkMode()
  const signOnThemeName = isDarkMode ? 'default-dark' : 'default-light'

  return (
    <>
      <Background />
      {isSplashScreenDismissed ? (
        <HarmonyThemeProvider themeName={signOnThemeName}>
          <Flex flex={1} style={css({ flexGrow: 1, zIndex: 2 })} h='100%'>
            <SignOnOverlayNav />
            <ExpandablePanel>
              <IconAudiusLogoHorizontalNew
                style={css({ alignSelf: 'center' })}
                width={200}
                color='default'
              />
              {screen === 'sign-up' ? (
                <CreateEmailScreen onChangeScreen={setScreen} />
              ) : (
                <SignInScreen />
              )}
            </ExpandablePanel>
            {screen === 'sign-up' ? (
              <AudiusValues
                isPanelExpanded={previousScreen && previousScreen !== screen}
              />
            ) : (
              <CreateAccountLink onPress={() => setScreen('sign-up')} />
            )}
          </Flex>
        </HarmonyThemeProvider>
      ) : null}
    </>
  )
}
