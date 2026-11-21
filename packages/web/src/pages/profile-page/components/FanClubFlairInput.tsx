import { useMemo } from 'react'

import { useTradeableCoins } from '@audius/common/api'
import { useOwnedCoins } from '@audius/common/hooks'
import type { CoinInfo } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import { Box, Text, Flex, IconCaretDown } from '@audius/harmony'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { TokenDropdown } from 'components/buy-sell-modal/components/TokenDropdown'

type FanClubBadge = {
  mint: string
  logo_uri: string
  ticker: string
}

type FanClubFlairInputProps = {
  selectedBadge?: Nullable<FanClubBadge>
  onChange: (badge: FanClubBadge | null) => void
}

const DEFAULT_OPTION_VALUE = '__default__'
const NONE_OPTION_VALUE = '__none__'

export const FanClubFlairInput = ({
  selectedBadge,
  onChange
}: FanClubFlairInputProps) => {
  const { coinsArray: allCoins, isLoading } = useTradeableCoins({
    excludeSymbols: ['USDC', 'AUDIO']
  })

  const { ownedCoins, isLoading: isOwnedCoinsLoading } = useOwnedCoins(allCoins)

  const isLoadingBoth = isLoading || isOwnedCoinsLoading

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
