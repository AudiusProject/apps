import { useCallback, useEffect, useState } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import type { CoinInfo } from '@audius/common/store'
import {
  sanitizeNumericInput,
  formatTokenInputWithSmartDecimals
} from '@audius/common/utils'
import { Flex, Text, TextInput, TextInputSize } from '@audius/harmony'

import { StaticTokenDisplay } from './StaticTokenDisplay'
import { TokenDropdown } from './TokenDropdown'

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
  hideTokenDisplay?: boolean
}

export const OutputTokenSection = ({
  tokenInfo,
  amount,
  placeholder = '0.00',
  error,
  onAmountChange,
  availableTokens,
  onTokenChange,
  hideTokenDisplay = false
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
    <Flex direction='column' gap='m'>
      <Text variant='title' size='l' color='default'>
        {messages.youReceive}
      </Text>

      <Flex direction='column' gap='s'>
        <Flex alignItems='center' gap='s'>
          <Flex flex={1}>
            <TextInput
              label={messages.amountInputLabel(symbol)}
              hideLabel
              placeholder={placeholder}
              startAdornmentText={isStablecoin ? '$' : ''}
              endAdornmentText={symbol === 'USDC' ? 'USD' : `$${symbol}`}
              value={localAmount}
              onChange={(e) => handleTextChange(e.target.value)}
              type='number'
              error={error}
              size={TextInputSize.DEFAULT}
            />
          </Flex>

          {!hideTokenDisplay &&
          availableTokens &&
          availableTokens.length > 0 ? (
            <Flex css={{ minWidth: '60px' }}>
              <TokenDropdown
                selectedToken={tokenInfo}
                availableTokens={availableTokens}
                onTokenChange={onTokenChange || (() => {})}
              />
            </Flex>
          ) : !hideTokenDisplay ? (
            <StaticTokenDisplay tokenInfo={tokenInfo} />
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  )
}
