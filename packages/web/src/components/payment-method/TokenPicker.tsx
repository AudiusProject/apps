import { useCallback } from 'react'

import {
  useArtistCoin,
  useCurrentUserId,
  useUserCoins
} from '@audius/common/api'
import { Flex, FilterButton, Text } from '@audius/harmony'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'

const messages = {
  searchToken: 'Search Token'
}

const HelperText = ({ mint }: { mint: string }) => {
  const { data: coinInfo } = useArtistCoin(mint)

  return (
    <Text
      variant='body'
      color='subdued'
      ellipses
      textAlign='left'
      css={{ flex: '1 1 0' }}
    >
      {coinInfo?.name ?? ''}
    </Text>
  )
}

export const TokenPicker = ({
  selectedTokenAddress,
  onChange,
  onOpen,
  minUsdValue
}: {
  selectedTokenAddress: string
  onChange: (address: string) => void
  onOpen: () => void
  minUsdValue?: number
}) => {
  const { data: currentUserId } = useCurrentUserId()
  const {
    data: coins,
    isLoading: isCoinsLoading,
    error: coinsError
  } = useUserCoins({ userId: currentUserId })

  const handleChange = useCallback(
    (address: string) => {
      onChange(address)
    },
    [onChange]
  )

  if (isCoinsLoading || coinsError) return null

  const options = (coins ?? []).map((coin) => ({
    label: `$${coin.ticker}`,
    value: coin.mint,
    disabled: (minUsdValue ?? 0) > coin.balanceUsd,
    helperText: <HelperText mint={coin.mint} />,
    leadingElement: (
      <Flex borderRadius='s' style={{ overflow: 'hidden' }}>
        <TokenIcon hex logoURI={coin.logoUri ?? ''} size='l' />
      </Flex>
    )
  }))

  return (
    <FilterButton
      virtualized
      label='asset'
      size='small'
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        maxHeight: 400,
        width: 300
      }}
      options={options}
      value={selectedTokenAddress}
      onChange={handleChange}
      onOpen={onOpen}
      showFilterInput
      variant='replaceLabel'
      filterInputProps={{ label: messages.searchToken }}
    />
  )
}
