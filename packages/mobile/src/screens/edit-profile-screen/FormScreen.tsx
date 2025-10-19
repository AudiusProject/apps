import { useCallback } from 'react'

import { useNavigation } from '@react-navigation/native'
import { isEmpty } from 'lodash'
import { View } from 'react-native'

import { Button, Flex, IconUser, useTheme } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

import type { ScreenProps } from '../../components/core/Screen'
import { ScreenContent, Screen } from '../../components/core/Screen'

const messages = {
  cancel: 'Cancel',
  save: 'Save',
  editProfile: 'Edit Profile'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4
  }
}))

type FormScreenProps = ScreenProps & {
  onSubmit: () => void
  onReset: () => void
  errors?: Record<string, unknown>
}

export const FormScreen = (props: FormScreenProps) => {
  const { children, onSubmit, onReset, errors, ...other } = props
  const styles = useStyles()
  const { spacing } = useTheme()
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
      <View style={styles.actionBar}>
        <Flex
          direction='row'
          gap='s'
          p='l'
          style={{ paddingBottom: spacing.l }}
        >
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
