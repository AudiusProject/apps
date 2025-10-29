import { useField } from 'formik'

import { Box, Flex } from '@audius/harmony-native'
import { Switch, Text } from 'app/components/core'
import { PriceField } from 'app/components/fields/PriceField'

import { BoxedTextField } from './BoxedTextField'

export const TRACK_PRICE = 'stream_conditions.usdc_purchase.price'
export const IS_OWNED_BY_USER = 'is_owned_by_user'

const messages = {
  title: 'Set a Price',
  description: 'The price to unlock this track (min $1)',
  label: 'Cost to Unlock',
  placeholder: '1.00',
  usdc: '(USDC)',
  publishingRights: {
    checkboxLabel: 'Direct Publishing Payments',
    confirmationText:
      'In order to receive direct publishing payments from Audius, I hereby confirm:',
    bulletPoints: [
      'I own all publishing rights to this music, including performance rights',
      'I am not registered with a Performing Rights Organization or collection society'
    ]
  }
}

export const TrackPriceField = () => {
  const [{ value: isOwnedByUser }, _ignored, { setValue: setIsOwnedByUser }] =
    useField<boolean>(IS_OWNED_BY_USER)

  return (
    <BoxedTextField
      title={messages.title}
      description={messages.description}
      TextField={PriceField}
      name={TRACK_PRICE}
      label={messages.label}
      placeholder={messages.placeholder}
      endAdornment={
        <Text color='neutralLight2' weight='bold'>
          {messages.usdc}
        </Text>
      }
    >
      <Box>
        <Flex
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          mb='s'
          gap='xs'
        >
          <Text weight='bold'>{messages.publishingRights.checkboxLabel}</Text>
          <Switch
            value={isOwnedByUser}
            onValueChange={(value) => {
              setIsOwnedByUser(value)
            }}
          />
        </Flex>
        <Text>{messages.publishingRights.confirmationText}</Text>
        <Box as='ul' mt='s'>
          {messages.publishingRights.bulletPoints.map((point) => (
            <Box key={point} mb='s'>
              <Text bulleted>{point}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </BoxedTextField>
  )
}
