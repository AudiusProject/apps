import {
  transformArtistCoinToTokenInfo,
  useArtistCoin
} from '@audius/common/api'
import { useFormattedTokenBalance } from '@audius/common/hooks'

import { Flex, Text } from '@audius/harmony-native'

import { TokenIcon } from './TokenIcon'

export type BalanceSectionProps = {
  /** Mint address for fetching balance */
  mint?: string
}

export const BalanceSection = ({ mint }: BalanceSectionProps) => {
  const { tokenBalanceFormatted } = useFormattedTokenBalance(mint ?? '')
  const { data: coin } = useArtistCoin({ mint: mint ?? '' })
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

  return (
    <Flex row gap='s' alignItems='center'>
      <TokenIcon logoURI={tokenInfo?.logoURI} size={64} />
      <Flex gap='xs'>
        <Flex>
          <Text variant='heading' size='l'>
            {tokenBalanceFormatted}
          </Text>
          <Text variant='heading' size='s' color='subdued'>
            {tokenInfo?.symbol}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
