import { useCallback } from 'react'

import { Pressable } from 'react-native'

import { Text } from '@audius/harmony-native'

import type { ScreenProps } from '../../components/core/Screen'
import { ScreenContent, Screen } from '../../components/core/Screen'

const messages = {
  save: 'Save',
  editProfile: 'Edit profile'
}

type FormScreenProps = ScreenProps & {
  onSubmit: () => void
  /** Save is offered only when there's something valid to save. */
  canSubmit: boolean
}

const ScreenTitle = () => (
  <Text variant='title' size='l' accessibilityRole='header'>
    {messages.editProfile}
  </Text>
)

/**
 * Edit profile chrome: back discards, Save sits in the header. No footer bar,
 * so the form gets the whole screen.
 */
export const FormScreen = (props: FormScreenProps) => {
  const { children, onSubmit, canSubmit, ...other } = props

  const handleSave = useCallback(() => {
    if (canSubmit) onSubmit()
  }, [canSubmit, onSubmit])

  return (
    <Screen
      variant='secondary'
      headerTitle={ScreenTitle}
      topbarRight={
        <Pressable
          onPress={handleSave}
          disabled={!canSubmit}
          accessibilityRole='button'
          accessibilityState={{ disabled: !canSubmit }}
          hitSlop={12}
        >
          <Text
            variant='title'
            size='m'
            color={canSubmit ? 'active' : 'subdued'}
            style={{ paddingHorizontal: 8 }}
          >
            {messages.save}
          </Text>
        </Pressable>
      }
      {...other}
    >
      <ScreenContent>{children}</ScreenContent>
    </Screen>
  )
}
