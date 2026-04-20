import { useTradeableCoins } from '@audius/common/api'
import { useFanClubMessageHeader } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import type { ChatBlastAudience } from '@audius/sdk'
import { Platform } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core/TokenIcon'

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
      row
      ph='l'
      pv='xs'
      gap='m'
      alignItems='center'
      justifyContent='space-between'
      backgroundColor='surface1'
      borderBottom='default'
    >
      <Flex row gap='xs' alignItems='center'>
        <TokenIcon logoURI={coins[fanClubSymbol]?.logoURI} size='xs' />
        {/* Alignment bug for label text variant on iOS */}
        <Flex mt={Platform.OS === 'ios' ? '2xs' : 'none'}>
          <Text variant='label' size='s'>
            {fanClubSymbol}
          </Text>
        </Flex>
      </Flex>
      <Flex mt={Platform.OS === 'ios' ? '2xs' : 'none'}>
        <Text variant='label' size='s' color='accent'>
          {messages.membersOnly}
        </Text>
      </Flex>
    </Flex>
  )
}
