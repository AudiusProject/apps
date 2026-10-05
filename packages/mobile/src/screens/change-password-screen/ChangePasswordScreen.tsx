import { useCallback, useEffect } from 'react'

import {
  ChangePasswordPage,
  useChangePasswordFormConfiguration
} from '@audius/common/hooks'
import type {
  EventListenerCallback,
  EventMapCore,
  NavigationState
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Formik, useFormikContext } from 'formik'
import { TouchableOpacity } from 'react-native'

import {
  IconArrowRight,
  IconClose,
  IconLock,
  Button
} from '@audius/harmony-native'
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
  VerifyEmailSubScreen,
  NewPasswordSubScreen
} from './SubScreens'

const messages = {
  change: 'Change Password',
  continue: 'Continue',
  success: 'Password updated!'
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

const ChangePasswordHeaderLeft = ({ page }: { page: ChangePasswordPage }) => {
  const navigation = useNavigation()
  if (page === ChangePasswordPage.VerifyEmail) {
    return <BackButton />
  } else {
    return (
      <TouchableOpacity onPress={() => navigation.getParent()?.goBack()}>
        <IconClose size='l' color='subdued' />
      </TouchableOpacity>
    )
  }
}

const ChangePasswordNavigator = ({
  page,
  setPage
}: {
  page: ChangePasswordPage
  setPage: (page: ChangePasswordPage) => void
}) => {
  const { handleSubmit, isSubmitting } = useFormikContext()
  const styles = useStyles()
  const navigation = useNavigation()

  // Only show the back button on the OTP page
  const screenOptions = useAppScreenOptions({
    headerRight: () => null,
    headerLeft: () => {
      return <ChangePasswordHeaderLeft page={page} />
    }
  })

  // Map hook page state to screen navigations. The pages live in the nested
  // stack, so target them through this screen's route.
  useEffect(() => {
    navigation.navigate('ChangePassword', {
      screen: ChangePasswordPage[page],
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
      const newPage = ChangePasswordPage[route?.name]
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
            name={ChangePasswordPage[ChangePasswordPage.ConfirmPassword]}
            component={ConfirmPasswordSubScreen}
          />
          <Stack.Screen
            name={ChangePasswordPage[ChangePasswordPage.VerifyEmail]}
            component={VerifyEmailSubScreen}
          />
          <Stack.Screen
            name={ChangePasswordPage[ChangePasswordPage.NewPassword]}
            component={NewPasswordSubScreen}
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
              page === ChangePasswordPage.NewPassword
                ? IconLock
                : IconArrowRight
            }
            disabled={isSubmitting}
            onPress={() => {
              handleSubmit()
            }}
          >
            {page === ChangePasswordPage.NewPassword
              ? messages.change
              : messages.continue}
          </Button>
        </KeyboardAvoidingView>
      </ScreenContent>
    </Screen>
  )
}

const ChangePasswordScreen = () => {
  const navigation = useNavigation()
  const { toast } = useToast()

  const onSuccess = useCallback(() => {
    navigation.goBack()
    toast({ content: messages.success, type: 'info' })
  }, [navigation, toast])

  const { page, setPage, ...formikConfiguration } =
    useChangePasswordFormConfiguration(onSuccess)

  return (
    <Formik {...formikConfiguration}>
      <ChangePasswordNavigator page={page} setPage={setPage} />
    </Formik>
  )
}

export const ChangePasswordModalScreen = () => {
  return (
    <ModalScreen>
      <ChangePasswordScreen />
    </ModalScreen>
  )
}
