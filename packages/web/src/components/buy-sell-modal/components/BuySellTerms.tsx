import { buySellMessages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Text, TextLink } from '@audius/harmony'

const { TERMS_OF_SERVICE } = route

export const BuySellTerms = () => {
  return (
    <Text variant='body'>
      {buySellMessages.termsAgreement}{' '}
      <TextLink href={TERMS_OF_SERVICE} variant='visible' isExternal>
        {buySellMessages.termsOfUse}
      </TextLink>
    </Text>
  )
}
