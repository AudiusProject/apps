import { IconCheck, Checkbox, Flex, Text } from '@audius/harmony'
import { Field, useFormikContext } from 'formik'

import type { LaunchpadFormValues } from '@audius/common/models'

const messages = {
  title: 'Confirm Your Rights',
  description:
    'Before continuing, please make sure you have permission to use each part of your Coin.',
  bulletName: 'You have the rights to use the Coin Name.',
  bulletSymbol: 'You have the rights to use the Ticker Symbol.',
  bulletImage: 'You have the rights to use the Coin Image.',
  checkboxLabel:
    'I confirm I have the necessary rights to use the Coin Name, Ticker Symbol, and Image.'
}

const bulletPoints = [
  messages.bulletName,
  messages.bulletSymbol,
  messages.bulletImage
]

export const SetupConfirmation = () => {
  const { setFieldValue, setFieldTouched } =
    useFormikContext<LaunchpadFormValues>()

  return (
    <Flex direction='column' gap='m' p='l' border='strong' borderRadius='m'>
      <Text variant='heading' size='xs' color='default'>
        {messages.title}
      </Text>
      <Text variant='body' size='m' color='subdued'>
        {messages.description}
      </Text>
      <Flex direction='column' gap='s'>
        {bulletPoints.map((bullet) => (
          <Flex key={bullet} gap='s' alignItems='flex-start'>
            <IconCheck size='s' color='positive' />
            <Text variant='body' size='m' color='default'>
              {bullet}
            </Text>
          </Flex>
        ))}
      </Flex>
      <Field name='setupConfirmation'>
        {({
          field,
          meta
        }: {
          field: {
            value: boolean
            onBlur: (event: React.FocusEvent<HTMLInputElement>) => void
          }
          meta: {
            error?: string
            touched?: boolean
          }
        }) => (
          <Flex direction='column' gap='xs'>
            <Flex gap='s' alignItems='flex-start'>
              <Checkbox
                {...field}
                checked={field.value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setFieldValue('setupConfirmation', event.target.checked)
                  setFieldTouched('setupConfirmation', true, false)
                }}
              />
              <Text variant='body' size='m' color='default'>
                {messages.checkboxLabel}
              </Text>
            </Flex>
            {meta.error && meta.touched ? (
              <Text variant='body' size='s' color='danger'>
                {meta.error}
              </Text>
            ) : null}
          </Flex>
        )}
      </Field>
    </Flex>
  )
}

