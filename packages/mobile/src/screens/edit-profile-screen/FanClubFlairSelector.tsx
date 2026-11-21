import { useMemo } from 'react'

import { useTradeableCoins } from '@audius/common/api'
import { useOwnedCoins } from '@audius/common/hooks'
import type { CoinInfo } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'

import { Flex, Text } from '@audius/harmony-native'
import { TokenSelectButton } from 'app/components/buy-sell/TokenSelectButton'

type FanClubBadge = {
  mint: string
  logo_uri: string
  ticker: string
}

type FanClubFlairSelectorProps = {
  selectedBadge?: Nullable<FanClubBadge>
  onChange: (badge: FanClubBadge | null) => void
}

const DEFAULT_OPTION_VALUE = '__default__'
const NONE_OPTION_VALUE = '__none__'

export const FanClubFlairSelector = ({
  selectedBadge,
  onChange
}: FanClubFlairSelectorProps) => {
  const { coinsArray: allCoins, isLoading } = useTradeableCoins({
    excludeSymbols: ['USDC', 'AUDIO']
  })

  const { ownedCoins } = useOwnedCoins(allCoins)

  const specialOptions: CoinInfo[] = useMemo(() => {
    return [
      {
        symbol: 'DEFAULT',
        name: 'Highest Balance',
        address: DEFAULT_OPTION_VALUE,
        decimals: 0,
        balance: null,
        logoURI: undefined,
        icon: undefined
      },
      {
        symbol: 'NONE',
        name: 'None',
        address: NONE_OPTION_VALUE,
        decimals: 0,
        balance: null,
        logoURI: undefined,
        icon: undefined
      }
    ]
  }, [])

  const availableCoins = useMemo(() => {
    const coins = [...specialOptions, ...ownedCoins]

    if (
      selectedBadge &&
      selectedBadge.mint !== DEFAULT_OPTION_VALUE &&
      selectedBadge.mint !== NONE_OPTION_VALUE
    ) {
      const isAlreadyIncluded = coins.some(
        (c) => c.address === selectedBadge.mint
      )
      if (!isAlreadyIncluded) {
        coins.push({
          symbol: selectedBadge.ticker,
          name: selectedBadge.ticker,
          address: selectedBadge.mint,
          decimals: 0,
          balance: null,
          logoURI: selectedBadge.logo_uri
        })
      }
    }

    return coins
  }, [specialOptions, ownedCoins, selectedBadge])

  const selectedCoin: CoinInfo = useMemo(() => {
    if (!selectedBadge) {
      return specialOptions[0]
    }

    if (selectedBadge.mint === DEFAULT_OPTION_VALUE) {
      return specialOptions[0]
    }
    if (selectedBadge.mint === NONE_OPTION_VALUE) {
      return specialOptions[1]
    }

    const coin = ownedCoins.find((c) => c.address === selectedBadge.mint)
    if (coin) {
      return coin
    }

    return {
      symbol: selectedBadge.ticker,
      name: selectedBadge.ticker,
      address: selectedBadge.mint,
      decimals: 0,
      balance: null,
      logoURI: selectedBadge.logo_uri
    }
  }, [selectedBadge, ownedCoins, specialOptions])

  const handleTokenChange = (coin: CoinInfo) => {
    if (coin.address === DEFAULT_OPTION_VALUE) {
      onChange({
        mint: DEFAULT_OPTION_VALUE,
        logo_uri: '',
        ticker: ''
      })
      return
    }
    if (coin.address === NONE_OPTION_VALUE) {
      onChange({
        mint: NONE_OPTION_VALUE,
        logo_uri: '',
        ticker: ''
      })
      return
    }

    const badge: FanClubBadge = {
      mint: coin.address,
      logo_uri: coin.logoURI || '',
      ticker: coin.symbol
    }
    onChange(badge)
  }

  if (isLoading) {
    return (
      <Flex p='m'>
        <Text variant='body' size='s' color='subdued'>
          Loading coins...
        </Text>
      </Flex>
    )
  }

  return (
    <TokenSelectButton
      selectedToken={selectedCoin}
      availableTokens={availableCoins}
      onTokenChange={handleTokenChange}
      title='Select Fan Club Flair'
    />
  )
}
