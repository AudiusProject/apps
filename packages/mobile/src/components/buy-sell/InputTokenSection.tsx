import React, { useCallback, useEffect, useState } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import type { CoinInfo } from '@audius/common/store'
import { useCoinAmountFormatting } from '@audius/common/store'
import {
  sanitizeNumericInput,
  formatTokenInputWithSmartDecimals
} from '@audius/common/utils'

import { Button, Flex, Text, TextInput, useTheme } from '@audius/harmony-native'

import { TokenIcon } from '../core'

import { TokenSelectButton } from './TokenSelectButton'
import { TooltipInfoIcon } from './TooltipInfoIcon'

type InputTokenSectionProps = {
  title: string
  tokenInfo: CoinInfo
  amount: string
  onAmountChange: (amount: string) => void
  onMaxClick: () => void
  availableBalance: number
  exchangeRate?: number | null
  placeholder?: string
  error?: boolean
  errorMessage?: string
  tokenPrice?: string | null
  isTokenPriceLoading?: boolean
  tokenPriceDecimalPlaces?: number
  availableTokens?: CoinInfo[]
  onTokenChange?: (token: CoinInfo) => void
}

export const InputTokenSection = ({
  title,
  tokenInfo,
  amount,
  onAmountChange,
  onMaxClick,
  availableBalance,
  exchangeRate,
  placeholder = '0.00',
  error,
  errorMessage,
  availableTokens,
  onTokenChange
}: InputTokenSectionProps) => {
  const { logoURI } = tokenInfo
  const { iconSizes } = useTheme()
  const iconSize = iconSizes.s
  const { spacing } = useTheme()
  const { symbol, isStablecoin } = tokenInfo
  const [localAmount, setLocalAmount] = useState(amount ?? '')

  const { formattedAvailableBalance } = useCoinAmountFormatting({
    amount,
    availableBalance,
    exchangeRate,
    isStablecoin: !!isStablecoin,
    decimals: tokenInfo.decimals,
    placeholder
  })

  const displayTokenDropdown = availableTokens && availableTokens.length > 0

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
      <Flex row justifyContent='space-between' alignItems='flex-start'>
        <Flex row alignItems='center' gap='xs'>
          <Text variant='title' size='l'>
            {title}
          </Text>
        </Flex>

        {formattedAvailableBalance ? (
          <Flex row alignItems='center' justifyContent='center' gap='xs'>
            <TokenIcon logoURI={logoURI} size={iconSize} />
            <Text strength='strong'>
              {messages.formattedAvailableBalance(
                formattedAvailableBalance,
                symbol,
                !!isStablecoin,
                messages.available
              )}
            </Text>
            <TooltipInfoIcon
              title={messages.availableToTrade}
              message={messages.availableToTradeTooltip}
            />
          </Flex>
        ) : null}
      </Flex>

      <Flex row alignItems='center' gap='s'>
        {displayTokenDropdown && onTokenChange ? (
          <Flex flex={1}>
            <TokenSelectButton
              selectedToken={tokenInfo}
              availableTokens={availableTokens ?? []}
              onTokenChange={onTokenChange}
              title={title}
            />
          </Flex>
        ) : null}

        {!displayTokenDropdown || !onTokenChange ? (
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
        ) : null}

        {onMaxClick ? (
          <Button
            variant='secondary'
            onPress={onMaxClick}
            style={{ height: spacing.unit16 }}
          >
            {messages.max}
          </Button>
        ) : null}
      </Flex>

      {displayTokenDropdown && onTokenChange ? (
        <Flex flex={1}>
          <TextInput
            label={messages.amountInputLabel(symbol)}
            hideLabel
            placeholder={placeholder}
            startAdornmentText={isStablecoin ? '$' : ''}
            endAdornmentText={symbol}
            value={localAmount}
            onChangeText={handleTextChange}
            keyboardType='numeric'
            error={error}
          />
        </Flex>
      ) : null}

      {errorMessage && (
        <Text variant='body' size='s' color='danger'>
          {errorMessage}
        </Text>
      )}
    </Flex>
  )
}
