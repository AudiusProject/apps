import React, { useCallback, useEffect, useState } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import type { CoinInfo } from '@audius/common/store'
import {
  sanitizeNumericInput,
  formatTokenInputWithSmartDecimals
} from '@audius/common/utils'

import { Flex, Text, TextInput } from '@audius/harmony-native'

import { TokenSelectButton } from './TokenSelectButton'

type OutputTokenSectionProps = {
  tokenInfo: CoinInfo
  amount: string
  availableBalance: number
  exchangeRate?: number | null
  tokenPrice?: string | null
  isTokenPriceLoading?: boolean
  tokenPriceDecimalPlaces?: number
  placeholder?: string
  error?: boolean
  onAmountChange?: (amount: string) => void
  onTokenChange?: (token: CoinInfo) => void
  availableTokens?: CoinInfo[]
}

export const OutputTokenSection = ({
  tokenInfo,
  amount,
  placeholder = '0.00',
  error,
  onAmountChange,
  availableTokens,
  onTokenChange
}: OutputTokenSectionProps) => {
  const { symbol, isStablecoin } = tokenInfo
  const [localAmount, setLocalAmount] = useState(amount || '')

  // Sync local state with prop changes and apply smart decimal formatting
  useEffect(() => {
    const formattedAmount = amount
      ? formatTokenInputWithSmartDecimals(amount)
      : ''
    setLocalAmount(formattedAmount)
  }, [amount])

  const debouncedOnAmountChange = useDebouncedCallback(
    (amount: string) => onAmountChange?.(amount),
    [onAmountChange],
    300
  )

  const handleTextChange = useCallback(
    (text: string) => {
      const sanitizedText = sanitizeNumericInput(text)
      const formattedText = formatTokenInputWithSmartDecimals(sanitizedText)
      setLocalAmount(formattedText)
      debouncedOnAmountChange(formattedText)
    },
    [debouncedOnAmountChange]
  )

  return (
    <Flex column gap='s'>
      <Flex row alignItems='center' gap='xs'>
        <Text variant='title' size='l'>
          {messages.youReceive}
        </Text>
      </Flex>
      <Flex column alignItems='center' gap='s'>
        <Flex flex={1}>
          <TextInput
            label={messages.amountInputLabel(symbol)}
            hideLabel
            placeholder={placeholder}
            startAdornmentText={isStablecoin ? '$' : ''}
            endAdornmentText={symbol === 'USDC' ? 'USD' : symbol}
            value={localAmount}
            onChangeText={handleTextChange}
            keyboardType='numeric'
            error={error}
          />
        </Flex>
        {availableTokens && availableTokens.length > 0 && onTokenChange && (
          <Flex flex={1}>
            <TokenSelectButton
              selectedToken={tokenInfo}
              availableTokens={availableTokens}
              onTokenChange={onTokenChange}
              title={messages.youReceive}
            />
          </Flex>
        )}
      </Flex>
    </Flex>
  )
}
