import { useMemo } from 'react'

import { useTradeableCoins } from '@audius/common/api'
import { useOwnedCoins } from '@audius/common/hooks'
import type { CoinInfo } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'

import { Flex, Text } from '@audius/harmony-native'
import { TokenSelectButton } from 'app/components/buy-sell/TokenSelectButton'

type ArtistCoinBadge = {
  mint: string
  logo_uri: string
  ticker: string
}

type ArtistCoinFlairSelectorProps = {
  selectedBadge?: Nullable<ArtistCoinBadge>
  onChange: (badge: ArtistCoinBadge | null) => void
}

// Special option values for Default and None
const DEFAULT_OPTION_VALUE = '__default__'
const NONE_OPTION_VALUE = '__none__'

export const ArtistCoinFlairSelector = ({
  selectedBadge,
  onChange
}: ArtistCoinFlairSelectorProps) => {
  // Fetch all tradeable coins, excluding USDC and AUDIO
  const { coinsArray: allCoins, isLoading } = useTradeableCoins({
    excludeSymbols: ['USDC', 'AUDIO']
  })

  // Filter to only owned coins
  const { ownedCoins } = useOwnedCoins(allCoins)

  // Create special "Default" and "None" coin options
  const specialOptions: CoinInfo[] = useMemo(() => {
    return [
      {
        symbol: 'DEFAULT',
        name: 'Default',
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

  // Combine special options with owned coins
  const availableCoins = useMemo(() => {
    const coins = [...specialOptions, ...ownedCoins]

    // Add currently selected coin if it's not already in the list
    // This ensures the previously selected coin appears in the dropdown
    // even after switching to Default or None
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

  // Convert selectedBadge to CoinInfo format for TokenSelectButton
  const selectedCoin: CoinInfo = useMemo(() => {
    // If no badge is selected, default to the first option (Default)
    if (!selectedBadge) {
      return specialOptions[0]
    }

    // Check if it's a special option
    if (selectedBadge.mint === DEFAULT_OPTION_VALUE) {
      return specialOptions[0]
    }
    if (selectedBadge.mint === NONE_OPTION_VALUE) {
      return specialOptions[1]
    }

    // Find the coin in ownedCoins
    const coin = ownedCoins.find((c) => c.address === selectedBadge.mint)
    if (coin) {
      return coin
    }

    // Fallback: create a CoinInfo from the badge
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
    // Handle special options
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

    // Convert CoinInfo to ArtistCoinBadge
    const badge: ArtistCoinBadge = {
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
      title='Select Artist Coin Flair'
    />
  )
}
