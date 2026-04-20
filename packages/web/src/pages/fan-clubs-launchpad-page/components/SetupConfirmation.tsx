import { launchpadMessages } from '@audius/common/messages'
import { Checkbox, Flex, Text } from '@audius/harmony'
import { useField } from 'formik'

const messages = {
  lead: launchpadMessages.setup.confirmationLead,
  strong: launchpadMessages.setup.confirmationStrong,
  period: launchpadMessages.setup.confirmationPeriod
}

export const SetupConfirmation = () => {
  const [field, meta, helpers] = useField<boolean>('setupConfirmation')

  return (
    <Flex direction='column' gap='xs'>
      <Flex gap='s' alignItems='center'>
        <Checkbox
          name={field.name}
          checked={field.value}
          onBlur={field.onBlur}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            helpers.setValue(event.target.checked)
            helpers.setTouched(true, false)
          }}
        />
        <Text variant='body' size='m' color='default'>
          {messages.lead}
          <Text strength='strong'>{messages.strong}</Text>
          {messages.period}
        </Text>
      </Flex>
      {meta.error && meta.touched ? (
        <Text variant='body' size='s' color='danger'>
          {meta.error}
        </Text>
      ) : null}
    </Flex>
  )
}
