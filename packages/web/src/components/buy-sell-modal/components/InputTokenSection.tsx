import { useCallback, useEffect, useState } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import type { CoinInfo } from '@audius/common/store'
import {
  sanitizeNumericInput,
  formatTokenInputWithSmartDecimals
} from '@audius/common/utils'
import { Button, Flex, Text, TextInput, TextInputSize } from '@audius/harmony'

import { StaticTokenDisplay } from './StaticTokenDisplay'
import { TokenDropdown } from './TokenDropdown'

type InputTokenSectionProps = {
  title: string
  tokenInfo: CoinInfo
  amount: string
  onAmountChange: (amount: string) => void
  onMaxClick: () => void
  placeholder?: string
  error?: boolean
  errorMessage?: string
  tokenPrice?: string | null
  isTokenPriceLoading?: boolean
  tokenPriceDecimalPlaces?: number
  availableTokens?: CoinInfo[]
  onTokenChange?: (token: CoinInfo) => void
  hideTokenDisplay?: boolean
}

export const InputTokenSection = ({
  title,
  tokenInfo,
  amount,
  onAmountChange,
  onMaxClick,
  placeholder = '0.00',
  error,
  errorMessage,
  availableTokens,
  onTokenChange,
  hideTokenDisplay = false
}: InputTokenSectionProps) => {
  const { symbol, isStablecoin } = tokenInfo
  const [localAmount, setLocalAmount] = useState(amount || '')

  const shouldDisplayTokenDropdown = availableTokens?.length

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
      <Flex justifyContent='space-between' alignItems='center'>
        <Text variant='title' size='l' color='default'>
          {title}
        </Text>
      </Flex>

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

          {!hideTokenDisplay && shouldDisplayTokenDropdown ? (
            <Flex css={(theme) => ({ minWidth: theme.spacing.unit15 })}>
              <TokenDropdown
                selectedToken={tokenInfo}
                availableTokens={availableTokens}
                onTokenChange={onTokenChange}
              />
            </Flex>
          ) : !hideTokenDisplay ? (
            <Flex css={(theme) => ({ minWidth: theme.spacing.unit15 })}>
              <StaticTokenDisplay tokenInfo={tokenInfo} />
            </Flex>
          ) : null}

          {onMaxClick ? (
            <Button variant='secondary' size='large' onClick={onMaxClick}>
              {messages.max}
            </Button>
          ) : null}
        </Flex>

        {errorMessage ? (
          <Text variant='body' size='s' color='danger'>
            {errorMessage}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  )
}
