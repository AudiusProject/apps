import { useEffect, useState } from 'react'

import { css } from '@emotion/native'
import type { RouteProp } from '@react-navigation/native'
import { useRoute } from '@react-navigation/native'
import {
  setField,
  updateRouteOnCompletion,
  setValueField
} from 'common/store/pages/signon/actions'
import { useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Divider,
  Flex,
  IconAudiusLogoHorizontalNew,
  Text,
  TextLink,
  ThemeProvider as HarmonyThemeProvider
} from '@audius/harmony-native'
import type { NonLinkProps } from 'app/harmony-native/components/TextLink/types'
import { dispatch } from 'app/store'

import type { SignOnScreenParamList } from '../types'

import { CreateEmailScreen } from './CreateEmailScreen'
import { SignInScreen } from './SignInScreen'
import type { SignOnScreenType } from './types'

const messages = {
  newToAudius: 'New to Audius?',
  createAccount: 'Create an Account'
}

const CreateAccountLink = (props: NonLinkProps) => {
  const { onPress } = props

  return (
    <Flex
      alignItems='center'
      justifyContent='flex-end'
      style={css({ flexGrow: 1 })}
    >
      <Text variant='title' strength='weak' textAlign='center' color='subdued'>
        {messages.newToAudius}{' '}
        <TextLink showUnderline onPress={onPress}>
          {messages.createAccount}
        </TextLink>
      </Text>
    </Flex>
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
  const insets = useSafeAreaInsets()

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

  const colorScheme = useColorScheme()
  const signOnThemeName =
    colorScheme === 'dark' ? 'default-dark' : 'default-light'

  if (!isSplashScreenDismissed) return null

  return (
    <HarmonyThemeProvider themeName={signOnThemeName}>
      <Flex
        flex={1}
        h='100%'
        backgroundColor='surface1'
        style={css({ paddingTop: insets.top })}
      >
        <Divider />
        <Flex
          flex={1}
          alignItems='stretch'
          style={css({ gap: 48, paddingHorizontal: 16, paddingVertical: 80 })}
        >
          <IconAudiusLogoHorizontalNew
            style={css({ alignSelf: 'center' })}
            height={48}
            width={236}
            color='default'
          />
          {screen === 'sign-up' ? (
            <CreateEmailScreen onChangeScreen={setScreen} />
          ) : (
            <SignInScreen />
          )}
          {screen === 'sign-in' ? (
            <CreateAccountLink onPress={() => setScreen('sign-up')} />
          ) : null}
        </Flex>
      </Flex>
    </HarmonyThemeProvider>
  )
}
