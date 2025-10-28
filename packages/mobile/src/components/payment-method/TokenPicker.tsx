import { useCallback, useMemo, useState } from 'react'

import { Portal } from '@gorhom/portal'
import { Image } from 'react-native'
import { SvgUri } from 'react-native-svg'
import { useAsync } from 'react-use'

import { Text, Flex, FilterButton } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { ListSelectionScreen } from 'app/screens/list-selection-screen'

const TOKEN_LIST_URL = 'https://cache.jup.ag/tokens'

const messages = {
  asset: 'Select Asset'
}

type Asset = {
  address: string
  name: string
  logoURI: string
  symbol: string
}

export const TokenPicker = ({
  selectedTokenAddress,
  onChange,
  onOpen
}: {
  selectedTokenAddress: string
  onChange: (address: string) => void
  onOpen: () => void
}) => {
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(
    selectedTokenAddress
  )

  const assets = useAsync(async () => {
    const res = await fetch(TOKEN_LIST_URL)
    const json = await res.json()
    return json as Asset[]
  }, [])

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

  const optionsMap: { [key: string]: Asset } = useMemo(
    () =>
      (assets.value ?? []).reduce((acc, cur) => {
        acc[cur.address] = cur
        return acc
      }, {}),
    [assets.value]
  )

  const options = useMemo(
    () =>
      (assets.value ?? []).map((asset) => ({
        label: asset.symbol,
        value: asset.address
      })),
    [assets.value]
  )

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedAddress),
    [selectedAddress, options]
  )

  if (assets.loading || assets.error) {
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
              {optionsMap[selectedOption?.value].logoURI.endsWith('svg') ? (
                <SvgUri
                  uri={optionsMap[selectedOption?.value].logoURI}
                  width={20}
                  height={20}
                />
              ) : (
                <Image
                  source={{ uri: optionsMap[selectedOption?.value].logoURI }}
                  width={20}
                  height={20}
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
            const asset = optionsMap[item.value]
            return (
              <Flex direction='row' alignItems='center' gap='s' flex={1}>
                <Flex borderRadius='s' style={{ overflow: 'hidden' }}>
                  {asset.logoURI.endsWith('svg') ? (
                    <SvgUri uri={asset.logoURI} width={20} height={20} />
                  ) : (
                    <Image
                      source={{ uri: asset.logoURI }}
                      width={20}
                      height={20}
                    />
                  )}
                </Flex>
                <Text>{item.label}</Text>
                <Text
                  style={{ flex: 1 }}
                  color='subdued'
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {`(${asset.name})`}
                </Text>
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
