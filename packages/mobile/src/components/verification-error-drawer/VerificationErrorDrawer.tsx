import { Text, Flex, Button, IconError } from '@audius/harmony-native'
import { AppDrawer, useDrawerState } from 'app/components/drawer/AppDrawer'

const MODAL_NAME = 'VerificationError'

const messages = {
  drawerTitle: 'Verification Failed',
  message: 'Something went wrong. Please try again later.',
  closeText: 'Close'
}

export const VerificationErrorDrawer = () => {
  const { onClose } = useDrawerState(MODAL_NAME)

  return (
    <AppDrawer
      modalName={MODAL_NAME}
      title={messages.drawerTitle}
      titleIcon={IconError}
    >
      <Flex gap='m' ph='xl' pv='l' alignItems='center'>
        <Text variant='body' size='m' textAlign='center'>
          {messages.message}
        </Text>
        <Button fullWidth onPress={onClose}>
          {messages.closeText}
        </Button>
      </Flex>
    </AppDrawer>
  )
}
