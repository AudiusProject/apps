import type { LaunchpadFormValues } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Checkbox, Flex, Text } from '@audius/harmony'
import { Field, useFormikContext } from 'formik'

import { ExternalTextLink } from 'components/link'

const messages = {
  termsText: 'By checking this box I agree to the latest',
  termsOfService: 'terms of service',
  artistCoinsTerms: 'Artist Coin terms',
  artistCoinAcceptableUse: 'Artist Coin acceptable use policy'
}

export const AgreeToTerms = () => {
  const { setFieldValue } = useFormikContext<LaunchpadFormValues>()

  return (
    <Flex gap='s' alignItems='center'>
      <Field name='termsAgreed'>
        {({ field }: { field: any }) => (
          <Checkbox
            {...field}
            checked={field.value}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setFieldValue('termsAgreed', event.target.checked)
            }}
          />
        )}
      </Field>
      <Text variant='body' size='m' color='default'>
        {messages.termsText}{' '}
        <ExternalTextLink to={route.TERMS_OF_SERVICE} variant='visible'>
          {messages.termsOfService}
        </ExternalTextLink>
        , the{' '}
        <ExternalTextLink to={route.ARTIST_COIN_TERMS} variant='visible'>
          {messages.artistCoinsTerms}
        </ExternalTextLink>
        , and the{' '}
        <ExternalTextLink
          to={route.ARTIST_COIN_ACCEPTABLE_USE}
          variant='visible'
        >
          {messages.artistCoinAcceptableUse}
        </ExternalTextLink>
        .
      </Text>
    </Flex>
  )
}
