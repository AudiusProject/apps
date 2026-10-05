import { useCallback, useEffect } from 'react'

import {
  ChangeEmailPage,
  useChangeEmailFormConfiguration
} from '@audius/common/hooks'
import type {
  EventListenerCallback,
  EventMapCore,
  NavigationState
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Formik, useFormikContext } from 'formik'
import { TouchableOpacity } from 'react-native'

import { IconArrowRight, IconClose, Button } from '@audius/harmony-native'
import { BackButton } from 'app/app/navigation/BackButton'
import {
  KeyboardAvoidingView,
  ModalScreen,
  Screen,
  ScreenContent
} from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'

import { useAppScreenOptions } from '../app-screen/useAppScreenOptions'

import {
  ConfirmPasswordSubScreen,
  NewEmailSubScreen,
  VerifyEmailSubScreen
} from './SubScreens'

const messages = {
  change: 'Change Email',
  continue: 'Continue',
  success: 'Email updated!'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  screen: {
    justifyContent: 'space-between'
  },
  bottomSection: {
    overflow: 'hidden',
    height: 'auto',
    padding: spacing(4),
    paddingBottom: spacing(12),
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight6
  }
}))

const Stack = createNativeStackNavigator()

const ChangeEmailHeaderLeft = ({ page }: { page: ChangeEmailPage }) => {
  const navigation = useNavigation()
  if (page === ChangeEmailPage.VerifyEmail) {
    return <BackButton />
  } else {
    return (
      <TouchableOpacity onPress={() => navigation.getParent()?.goBack()}>
        <IconClose size='l' color='subdued' />
      </TouchableOpacity>
    )
  }
}

const ChangeEmailNavigator = ({
  page,
  setPage
}: {
  page: ChangeEmailPage
  setPage: (page: ChangeEmailPage) => void
}) => {
  const { handleSubmit, isSubmitting } = useFormikContext()
  const styles = useStyles()
  const navigation = useNavigation()

  // Only show the back button on the OTP page
  const screenOptions = useAppScreenOptions({
    headerRight: () => null,
    headerLeft: () => {
      return <ChangeEmailHeaderLeft page={page} />
    }
  })

  // Map hook page state to screen navigations. The pages live in the nested
  // stack, so target them through this screen's route.
  useEffect(() => {
    navigation.navigate('ChangeEmail', {
      screen: ChangeEmailPage[page],
      pop: true
    })
  }, [page, navigation])

  // Map navigations back to the hook page state
  const stateListener = useCallback<
    EventListenerCallback<EventMapCore<NavigationState>, 'state'>
  >(
    (e) => {
      const state = e.data.state
      const route = state.routes[state.index]
      const newPage = ChangeEmailPage[route?.name]
      if (newPage !== page) {
        setPage(newPage)
      }
    },
    [page, setPage]
  )

  return (
    <Screen variant='secondary' style={styles.screen}>
      <ScreenContent>
        <Stack.Navigator
          screenOptions={screenOptions}
          screenListeners={{
            state: stateListener
          }}
        >
          <Stack.Screen
            name={ChangeEmailPage[ChangeEmailPage.ConfirmPassword]}
            component={ConfirmPasswordSubScreen}
          />
          <Stack.Screen
            name={ChangeEmailPage[ChangeEmailPage.NewEmail]}
            component={NewEmailSubScreen}
          />
          <Stack.Screen
            name={ChangeEmailPage[ChangeEmailPage.VerifyEmail]}
            component={VerifyEmailSubScreen}
          />
        </Stack.Navigator>
        <KeyboardAvoidingView
          style={styles.bottomSection}
          keyboardShowingOffset={32}
        >
          <Button
            fullWidth
            variant='primary'
            iconRight={
              page === ChangeEmailPage.NewEmail ? undefined : IconArrowRight
            }
            disabled={isSubmitting}
            onPress={() => {
              handleSubmit()
            }}
          >
            {page === ChangeEmailPage.NewEmail
              ? messages.change
              : messages.continue}
          </Button>
        </KeyboardAvoidingView>
      </ScreenContent>
    </Screen>
  )
}

const ChangeEmailScreen = () => {
  const navigation = useNavigation()
  const { toast } = useToast()
  const onSuccess = useCallback(() => {
    navigation.goBack()
    toast({ content: messages.success, type: 'info' })
  }, [navigation, toast])
  const { page, setPage, ...formikConfiguration } =
    useChangeEmailFormConfiguration(onSuccess)

  return (
    <Formik {...formikConfiguration}>
      <ChangeEmailNavigator page={page} setPage={setPage} />
    </Formik>
  )
}

export const ChangeEmailModalScreen = () => {
  return (
    <ModalScreen>
      <ChangeEmailScreen />
    </ModalScreen>
  )
}
