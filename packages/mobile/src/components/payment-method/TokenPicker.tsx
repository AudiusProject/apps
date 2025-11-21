import { useCallback, useMemo, useState } from 'react'

import type { UserCoin } from '@audius/common/api'
import { useCurrentUserId, useUserCoins } from '@audius/common/api'
import { Portal } from '@gorhom/portal'
import { SvgUri } from 'react-native-svg'

import { Text, Flex, FilterButton } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { ListSelectionScreen } from 'app/screens/list-selection-screen'

import { TokenIcon } from '../core'

const messages = {
  asset: 'Select Token'
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
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(
    selectedTokenAddress
  )

  const { data: currentUserId } = useCurrentUserId()
  const {
    data: coins,
    isLoading: isCoinsLoading,
    error: coinsError
  } = useUserCoins({ userId: currentUserId })

  const handleSubmit = useCallback(() => {
    if (selectedAddress) {
      onChange(selectedAddress)
    }
  }, [onChange, selectedAddress])

  const navigation = useNavigation()

  const handlePressFilter = useCallback(() => {
    onOpen()
    navigation.navigate('TokenPicker')
  }, [navigation, onOpen])

  const optionsMap: { [key: string]: UserCoin } = useMemo(
    () =>
      (coins ?? []).reduce((acc, cur) => {
        acc[cur.mint] = cur
        return acc
      }, {}),
    [coins]
  )

  const options = useMemo(
    () =>
      (coins ?? []).map((coin) => ({
        label: coin.ticker,
        value: coin.mint,
        disabled: minUsdValue ? coin.balanceUsd < (minUsdValue ?? 0) : false
      })),
    [coins, minUsdValue]
  )

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedAddress),
    [selectedAddress, options]
  )

  if (isCoinsLoading || coinsError) {
    return null
  }

  return (
    <>
      <FilterButton
        variant='replaceLabel'
        label={selectedOption?.label}
        size='small'
        value={selectedTokenAddress}
        onPress={handlePressFilter}
        leadingElement={
          selectedOption ? (
            <Flex borderRadius='s' style={{ overflow: 'hidden' }}>
              {optionsMap[selectedOption?.value]?.logoUri?.endsWith('svg') ? (
                <SvgUri
                  uri={optionsMap[selectedOption?.value]?.logoUri ?? ''}
                  width={20}
                  height={20}
                />
              ) : (
                <TokenIcon
                  logoURI={optionsMap[selectedOption?.value]?.logoUri ?? ''}
                  size='l'
                />
              )}
            </Flex>
          ) : null
        }
      />
      <Portal hostName='TokenPickerPortal'>
        <ListSelectionScreen
          value={selectedAddress ?? ''}
          data={options}
          itemContentStyles={{ flexGrow: 1 }}
          searchText='Search for tokens'
          renderItem={({ item }) => {
            const coin = optionsMap[item.value]
            return (
              <Flex
                direction='row'
                alignItems='center'
                gap='s'
                flex={1}
                style={{ opacity: item.disabled ? 0.5 : 1 }}
              >
                <Flex
                  borderRadius='s'
                  style={{
                    overflow: 'hidden'
                  }}
                >
                  {coin?.logoUri?.endsWith('svg') ? (
                    <SvgUri uri={coin?.logoUri ?? ''} width={20} height={20} />
                  ) : (
                    <TokenIcon logoURI={coin?.logoUri ?? ''} size='l' />
                  )}
                </Flex>
                <Text>{item.label}</Text>
              </Flex>
            )
          }}
          screenTitle={messages.asset}
          onChange={setSelectedAddress}
          onSubmit={handleSubmit}
          clearable={false}
        />
      </Portal>
    </>
  )
}
