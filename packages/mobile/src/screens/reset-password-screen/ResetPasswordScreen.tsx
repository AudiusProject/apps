import { useCallback, useEffect } from 'react'

import { useHasAccount, useResetPassword } from '@audius/common/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View } from 'react-native'
import RNRestart from 'react-native-restart'
import { useAsync } from 'react-use'

import { IconClose } from '@audius/harmony-native'
import { ModalScreen, Screen, Text } from 'app/components/core'
import { EnterPassword } from 'app/components/enter-password'
import { ENTROPY_KEY } from 'app/constants/storage-keys'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'

import { TopBarIconButton } from '../app-screen'
import type { RootScreenParamList } from '../root-screen'

const messages = {
  title: 'Reset Your Password',
  description:
    'Create a password that is secure and easy to remember. Write it down or use a password manager.',
  resetButton: 'Submit',
  error: 'Unable to reset password...'
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    padding: spacing(4),
    gap: spacing(4)
  },
  description: {
    textAlign: 'center'
  }
}))

const Stack = createNativeStackNavigator()

const ResetPasswordScreen = () => {
  const styles = useStyles()
  const { params } = useRoute<RouteProp<RootScreenParamList, 'ResetPassword'>>()
  const { login, email } = params
  const navigation = useNavigation<NavigationProp<RootScreenParamList>>()
  const isSignedIn = useHasAccount()
  const { toast } = useToast()

  useAsync(async () => {
    await AsyncStorage.setItem(ENTROPY_KEY, atob(login))
  }, [])

  const {
    mutate: resetPassword,
    isPending,
    isSuccess,
    isError
  } = useResetPassword()

  const handleCancel = useCallback(() => {
    if (isSignedIn) {
      navigation.navigate('HomeStack', undefined, { pop: true })
    } else {
      navigation.navigate('SignOnStack', undefined, { pop: true })
    }
  }, [navigation, isSignedIn])

  const handleSubmit = useCallback(
    (password: string) => {
      resetPassword({ email, password })
    },
    [resetPassword, email]
  )

  // Restart on success
  useEffect(() => {
    if (isSuccess) {
      RNRestart.Restart()
    }
  }, [isSuccess])

  // Error handling
  useEffect(() => {
    if (isError) {
      toast({ content: messages.error })
    }
  }, [isError, toast])

  return (
    <Screen
      variant='white'
      title={messages.title}
      topbarLeft={<TopBarIconButton icon={IconClose} onPress={handleCancel} />}
      topbarRight={null}
    >
      <View style={styles.root}>
        <Text fontSize='large' color='neutralLight2' style={styles.description}>
          {messages.description}
        </Text>
        <EnterPassword
          onSubmit={handleSubmit}
          submitButtonText={messages.resetButton}
          isLoading={isPending}
        />
      </View>
    </Screen>
  )
}

export const ResetPasswordModalScreen = () => {
  const { params } = useRoute()

  return (
    <ModalScreen>
      <Stack.Navigator>
        <Stack.Screen
          initialParams={params}
          name='ResetPasswordInner'
          component={ResetPasswordScreen}
        />
      </Stack.Navigator>
    </ModalScreen>
  )
}
