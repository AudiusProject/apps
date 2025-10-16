import React, { useCallback, useMemo, useState } from 'react'

import type { CoinInfo } from '@audius/common/store'
import { Modal, TouchableOpacity } from 'react-native'

import { Text, Flex, IconCaretDown } from '@audius/harmony-native'
import type { ListSelectionData } from 'app/screens/list-selection-screen'
import { ListSelectionScreen } from 'app/screens/list-selection-screen'

import { TokenIcon } from '../core'

import { TokenSelectItem } from './TokenSelectItem'

type TokenSelectButtonProps = {
  selectedToken: CoinInfo
  availableTokens: CoinInfo[]
  onTokenChange: (token: CoinInfo) => void
  title: string
}

export const TokenSelectButton = ({
  selectedToken,
  availableTokens,
  onTokenChange,
  title
}: TokenSelectButtonProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tempSelectedToken, setTempSelectedToken] = useState<string>('')

  // Create token options map for quick lookup
  const tokensMap: { [key: string]: CoinInfo } = useMemo(
    () =>
      availableTokens.reduce(
        (acc, token) => {
          acc[token.symbol] = token
          return acc
        },
        {} as { [key: string]: CoinInfo }
      ),
    [availableTokens]
  )

  const handlePress = useCallback(() => {
    setTempSelectedToken(selectedToken.symbol)
    setIsVisible(true)
  }, [selectedToken.symbol])

  const handleSubmit = useCallback(() => {
    const token = tokensMap[tempSelectedToken]
    if (token) {
      onTokenChange(token)
    }
    setIsVisible(false)
  }, [tempSelectedToken, tokensMap, onTokenChange])

  const handleRequestClose = useCallback(() => {
    setIsVisible(false)
  }, [])

  // Convert tokens to selection data format
  const tokenOptions: ListSelectionData[] = useMemo(
    () =>
      availableTokens.map((token) => ({
        label: token.name,
        value: token.symbol
      })),
    [availableTokens]
  )

  const handleTokenSelect = useCallback((value: string) => {
    setTempSelectedToken(value)
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: ListSelectionData }) => {
      const token = tokensMap[item.value]
      return <TokenSelectItem token={token} item={item} />
    },
    [tokensMap]
  )

  if (!selectedToken) {
    return null
  }

  return (
    <>
      <TouchableOpacity onPress={handlePress}>
        <Flex
          row
          border='strong'
          borderRadius='s'
          justifyContent='space-between'
          alignItems='center'
          pv='s'
          ph='m'
          w='100%'
        >
          <Flex row alignItems='center' gap='s'>
            <TokenIcon logoURI={selectedToken.logoURI} size={48} />
            <Text variant='heading' size='s' color='subdued'>
              {selectedToken.symbol}
            </Text>
          </Flex>
          <IconCaretDown color='default' size='s' />
        </Flex>
      </TouchableOpacity>
      <Modal
        visible={isVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={handleRequestClose}
      >
        <ListSelectionScreen
          screenTitle={title}
          value={tempSelectedToken}
          data={tokenOptions}
          searchText='Search for tokens'
          itemContentStyles={{ flexGrow: 1 }}
          renderItem={renderItem}
          onChange={handleTokenSelect}
          onSubmit={handleSubmit}
          clearable={false}
          stopNavigation
        />
      </Modal>
    </>
  )
}
