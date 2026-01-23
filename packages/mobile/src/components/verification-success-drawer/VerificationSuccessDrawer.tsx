import { Text, Flex, Button, IconVerified } from '@audius/harmony-native'
import { AppDrawer, useDrawerState } from 'app/components/drawer/AppDrawer'

const MODAL_NAME = 'VerificationSuccess'

const messages = {
  drawerTitle: 'Verification Submitted',
  message:
    'Verification request received, pending review. Check back soon!',
  pending: 'Pending',
  closeText: 'Close'
}

export const VerificationSuccessDrawer = () => {
  const { onClose } = useDrawerState(MODAL_NAME)

  return (
    <AppDrawer modalName={MODAL_NAME}>
      <Flex gap='m' ph='xl' pv='l' alignItems='center'>
        <Flex alignItems='center' gap='s' mb='m'>
          <IconVerified size='xl' />
          <Text variant='label' size='xl'>
            {messages.pending}
          </Text>
        </Flex>
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
