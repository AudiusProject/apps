import { useFormikContext } from 'formik'

import { Button, Flex, IconTowerBroadcast } from '@audius/harmony-native'
import { HeaderShadow } from 'app/components/core'

import { FormScreen } from '../form-screen'

import { ChatBlastSelectAudienceFields } from './ChatBlastSelectAudienceFields'

const messages = {
  title: 'Select Audience',
  continue: 'Continue'
}

export const ChatBlastSelectAudienceScreen = () => {
  const { submitForm, isSubmitting } = useFormikContext()
  return (
    <FormScreen
      title={messages.title}
      icon={IconTowerBroadcast}
      variant='white'
      bottomSection={
        <Button
          variant='primary'
          fullWidth
          onPress={submitForm}
          disabled={!!isSubmitting}
        >
          {messages.continue}
        </Button>
      }
    >
      <Flex gap='l'>
        <HeaderShadow />
        <ChatBlastSelectAudienceFields />
      </Flex>
    </FormScreen>
  )
}
