import { useCallback } from 'react'

import { useNavigation } from '@react-navigation/native'
import { isEmpty } from 'lodash'

import { Button, Flex, IconUser } from '@audius/harmony-native'
import { FixedFooter } from 'app/components/core/FixedFooter'

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

      <FixedFooter avoidKeyboard>
        <Flex direction='row' gap='s' w='100%'>
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
      </FixedFooter>
    </Screen>
  )
}
