import { buySellMessages } from '@audius/common/messages'
import { route } from '@audius/common/utils'

import { Text, TextLink } from '@audius/harmony-native'
import { env } from 'app/services/env'

const termsOfUseLink = `${env.AUDIUS_URL}${route.TERMS_OF_SERVICE}`

export const BuySellTerms = () => {
  return (
    <Text size='s' variant='body'>
      {buySellMessages.termsAgreement}{' '}
      <TextLink variant='visible' url={termsOfUseLink} isExternal>
        {buySellMessages.termsOfUse}
      </TextLink>
      .
    </Text>
  )
}
