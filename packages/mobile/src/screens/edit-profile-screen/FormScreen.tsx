import { useCallback } from 'react'

import { useNavigation } from '@react-navigation/native'
import { isEmpty } from 'lodash'
import { View } from 'react-native'

import { Button, Flex, IconUser, useTheme } from '@audius/harmony-native'

import type { ScreenProps } from '../../components/core/Screen'
import { ScreenContent, Screen } from '../../components/core/Screen'

const messages = {
  cancel: 'Cancel',
  save: 'Save',
  editProfile: 'Edit Profile'
}

type FormScreenProps = ScreenProps & {
  onSubmit: () => void
  onReset: () => void
  errors?: Record<string, unknown>
}

export const FormScreen = (props: FormScreenProps) => {
  const { children, onSubmit, onReset, errors, ...other } = props
  const { color, shadows } = useTheme()
  const navigation = useNavigation()

  const handleCancel = useCallback(() => {
    onReset()
    navigation.goBack()
  }, [navigation, onReset])

  return (
    <Screen
      variant='white'
      title={messages.editProfile}
      icon={IconUser}
      {...other}
    >
      <ScreenContent>{children}</ScreenContent>

      {/* Bottom Action Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: color.background.white,
          borderTopWidth: 1,
          borderTopColor: color.border.default,
          ...shadows.midInverted
        }}
      >
        <Flex direction='row' gap='s' p='l' pb='l'>
          <Button
            variant='secondary'
            size='default'
            onPress={handleCancel}
            style={{ flex: 1 }}
          >
            {messages.cancel}
          </Button>
          <Button
            variant='primary'
            size='default'
            onPress={onSubmit}
            disabled={!isEmpty(errors)}
            style={{ flex: 1 }}
          >
            {messages.save}
          </Button>
        </Flex>
      </View>
    </Screen>
  )
}
