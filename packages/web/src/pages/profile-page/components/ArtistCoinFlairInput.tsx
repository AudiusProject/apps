import { useMemo } from 'react'

import { useTradeableCoins } from '@audius/common/api'
import { useOwnedCoins } from '@audius/common/hooks'
import type { CoinInfo } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import { Box, Text, Flex, IconCaretDown } from '@audius/harmony'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { TokenDropdown } from 'components/buy-sell-modal/components/TokenDropdown'

type ArtistCoinBadge = {
  mint: string
  logo_uri: string
  ticker: string
}

type ArtistCoinFlairInputProps = {
  selectedBadge?: Nullable<ArtistCoinBadge>
  onChange: (badge: ArtistCoinBadge | null) => void
}

// Special option values for Default and None
const DEFAULT_OPTION_VALUE = '__default__'
const NONE_OPTION_VALUE = '__none__'

export const ArtistCoinFlairInput = ({
  selectedBadge,
  onChange
}: ArtistCoinFlairInputProps) => {
  // Fetch all tradeable coins, excluding USDC and AUDIO
  const { coinsArray: allCoins, isLoading } = useTradeableCoins({
    excludeSymbols: ['USDC', 'AUDIO']
  })

  // Filter to only owned coins
  const { ownedCoins, isLoading: isOwnedCoinsLoading } = useOwnedCoins(allCoins)

  // Show loading state until both queries are complete
  const isLoadingBoth = isLoading || isOwnedCoinsLoading

  // Create special "Highest Balance" and "None" coin options
  const specialOptions: CoinInfo[] = useMemo(() => {
    return [
      {
        symbol: '',
        name: 'Highest Balance',
        address: DEFAULT_OPTION_VALUE,
        decimals: 0,
        balance: null,
        logoURI: undefined,
        icon: undefined
      },
      {
        symbol: '',
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
    // even after switching to Highest Balance or None
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

  // Convert selectedBadge to CoinInfo format for TokenDropdown
  const selectedCoin: CoinInfo = useMemo(() => {
    // If no badge is selected, default to the first option (Highest Balance)
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

  if (isLoadingBoth) {
    return (
      <Flex
        gap='xs'
        alignItems='center'
        justifyContent='space-between'
        border='strong'
        borderRadius='s'
        pv='s'
        ph='m'
        w='100%'
        backgroundColor='surface2'
      >
        <Text variant='body' size='m' color='subdued'>
          Loading coins...
        </Text>
      </Flex>
    )
  }

  // Custom trigger element matching Figma design for edit profile flow
  const customTrigger = (
    <Flex
      gap='xs'
      alignItems='center'
      justifyContent='space-between'
      border='strong'
      borderRadius='s'
      pv='s'
      ph='m'
      w='100%'
      backgroundColor='surface2'
      css={{
        cursor: 'pointer'
      }}
    >
      <Flex gap='s' alignItems='center' flex={1}>
        <TokenIcon
          logoURI={selectedCoin.logoURI}
          icon={selectedCoin.icon}
          size='l'
          hex
        />
        <Text variant='body' size='m' color='default'>
          {selectedCoin.name}
        </Text>
      </Flex>
      <IconCaretDown size='s' color='default' />
    </Flex>
  )

  return (
    <Box
      css={{
        position: 'relative'
      }}
    >
      <TokenDropdown
        selectedToken={selectedCoin}
        availableTokens={availableCoins}
        onTokenChange={handleTokenChange}
        disabled={false}
        anchorOriginHorizontal='left'
        customTrigger={customTrigger}
        sortAlphabetically={false}
      />
    </Box>
  )
}
