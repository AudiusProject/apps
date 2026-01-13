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
import { ImageBackground, SafeAreaView } from 'react-native'
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
  IconAudiusLogoHorizontalColorNew,
  IconAudiusLogoHorizontalNew,
  Paper,
  RadialGradient,
  Text,
  TextLink,
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
          color='white'
          style={{ justifyContent: 'flex-end' }}
        >
          {messages.newToAudius}{' '}
          <TextLink variant='inverted' showUnderline onPress={onPress}>
            {messages.createAccount}
          </TextLink>
        </Text>
      </SafeAreaView>
    </AnimatedFlex>
  )
}

const Background = () => {
  return (
    <Flex
      h='100%'
      w='100%'
      alignItems='center'
      justifyContent='flex-end'
      style={css({
        position: 'absolute',
        top: 0,
        left: 0
      })}
    >
      <RadialGradient
        style={css({ position: 'absolute', zIndex: 1 })}
        colors={[
          'rgba(91, 35, 225, 0.8)',
          'rgba(113, 41, 230, 0.64)',
          'rgba(162, 47, 235, 0.5)'
        ]}
        stops={[0, 0.67, 1]}
        radius={100}
      />
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
  const theme = useTheme()
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

  return (
    <>
      <Background />
      {isSplashScreenDismissed ? (
        <Flex flex={1} style={css({ flexGrow: 1, zIndex: 2 })} h='100%'>
          <ExpandablePanel>
            {theme.type === 'dark' ? (
              <IconAudiusLogoHorizontalNew
                style={css({ alignSelf: 'center' })}
                width={200}
                color='inverse'
              />
            ) : (
              <IconAudiusLogoHorizontalColorNew
                style={css({ alignSelf: 'center' })}
              />
            )}
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
      ) : null}
    </>
  )
}
