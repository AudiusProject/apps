import React from 'react'

import type { CoinInfo } from '@audius/common/store'

import { Flex, Text } from '@audius/harmony-native'
import type { ListSelectionData } from 'app/screens/list-selection-screen'

import { TokenIcon } from '../core'

type TokenSelectItemProps = {
  token: CoinInfo
  item: ListSelectionData
}

export const TokenSelectItem = ({ token, item }: TokenSelectItemProps) => {
  return (
    <Flex row alignItems='center' gap='s' flex={1}>
      <Flex borderRadius='s' style={{ overflow: 'hidden' }}>
        <TokenIcon logoURI={token.logoURI} size='xl' />
      </Flex>
      <Flex flex={1}>
        <Text
          variant='title'
          size='l'
          strength='weak'
          numberOfLines={1}
          ellipsizeMode='tail'
        >
          {token.name}
        </Text>
        <Text
          variant='body'
          size='s'
          color='subdued'
          numberOfLines={1}
          ellipsizeMode='tail'
        >
          {token.symbol}
        </Text>
      </Flex>
    </Flex>
  )
}
