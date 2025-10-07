import { useTokens } from '@audius/common/api'
import { useArtistCoinMessageHeader } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import type { ChatBlastAudience } from '@audius/sdk'
import { Platform } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core/TokenIcon'

const messages = {
  membersOnly: 'Members Only'
}

export const ArtistCoinHeader = ({
  userId,
  audience
}: {
  userId: ID
  audience?: ChatBlastAudience
}) => {
  const artistCoinSymbol = useArtistCoinMessageHeader({
    userId,
    audience
  })
  const { tokens } = useTokens()

  if (!artistCoinSymbol) return null

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
        <TokenIcon logoURI={tokens[artistCoinSymbol]?.logoURI} size='xs' />
        {/* Alignment bug for label text variant on iOS */}
        <Flex mt={Platform.OS === 'ios' ? '2xs' : 'none'}>
          <Text variant='label' size='s'>
            {artistCoinSymbol}
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
