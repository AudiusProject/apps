import {
  transformArtistCoinToTokenInfo,
  useArtistCoin
} from '@audius/common/api'
import { useFormattedCoinBalance } from '@audius/common/hooks'

import { Flex, Text } from '@audius/harmony-native'
import Skeleton from 'app/components/skeleton'

import { TokenIcon } from './TokenIcon'

export type BalanceSectionProps = {
  /** Mint address for fetching balance */
  mint?: string
  /** Whether to enable polling for balance updates */
  isPolling?: boolean
  /** Interval for polling in milliseconds */
  pollingInterval?: number
  /** Whether to show only internal wallet balance (excludes external wallets and staked) */
  internalWalletOnly?: boolean
}

export const BalanceSection = ({
  mint,
  isPolling,
  pollingInterval,
  internalWalletOnly = false
}: BalanceSectionProps) => {
  const { coinBalanceFormatted, isCoinBalanceLoading, isCoinPriceLoading } =
    useFormattedCoinBalance(
      mint ?? '',
      'en-US',
      isPolling,
      pollingInterval,
      !internalWalletOnly, // includeExternalWallets
      !internalWalletOnly // includeStaked
    )

  const { data: coin, isPending: isCoinLoading } = useArtistCoin(mint)
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

  const isLoading =
    isCoinBalanceLoading || isCoinPriceLoading || (!!mint && isCoinLoading)

  if (isLoading && mint) {
    return (
      <Flex row gap='s' alignItems='center'>
        <Skeleton width={64} height={64} style={{ borderRadius: 32 }} />
        <Flex gap='xs'>
          <Skeleton width={80} height={24} />
          <Skeleton width={48} height={16} />
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex row gap='s' alignItems='center'>
      <TokenIcon logoURI={tokenInfo?.logoURI} size={64} />
      <Flex gap='xs'>
        <Flex>
          <Text variant='heading' size='l'>
            {coinBalanceFormatted ?? '0'}
          </Text>
          <Text variant='heading' size='s' color='subdued'>
            {tokenInfo?.symbol ? `$${tokenInfo.symbol}` : ''}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
