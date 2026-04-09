import { useTradeableCoins } from '@audius/common/api'
import { useFanClubMessageHeader } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { Flex, Text } from '@audius/harmony'
import { ChatBlastAudience } from '@audius/sdk'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'

const messages = {
  membersOnly: 'Members Only'
}

export const FanClubHeader = ({
  userId,
  audience
}: {
  userId: ID
  audience?: ChatBlastAudience
}) => {
  const fanClubSymbol = useFanClubMessageHeader({
    userId,
    audience
  })

  const { coins } = useTradeableCoins()

  if (!fanClubSymbol) return null

  return (
    <Flex
      ph='l'
      pv='xs'
      gap='m'
      justifyContent='space-between'
      alignItems='center'
      backgroundColor='surface1'
      borderBottom='default'
    >
      <Flex gap='xs' alignItems='center'>
        <TokenIcon logoURI={coins[fanClubSymbol]?.logoURI} size='xs' hex />
        <Text variant='label' size='s'>
          {fanClubSymbol}
        </Text>
      </Flex>
      <Text variant='label' size='s' color='accent'>
        {messages.membersOnly}
      </Text>
    </Flex>
  )
}
