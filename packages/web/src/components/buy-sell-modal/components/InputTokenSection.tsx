import { useCallback, useEffect, useState } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import type { TokenInfo } from '@audius/common/store'
import { useTokenAmountFormatting } from '@audius/common/store'
import {
  sanitizeNumericInput,
  formatTokenInputWithSmartDecimals
} from '@audius/common/utils'
import {
  Button,
  Flex,
  Text,
  TextInput,
  IconInfo,
  TextInputSize
} from '@audius/harmony'

import { Tooltip } from 'components/tooltip'

import { TokenIcon } from '../TokenIcon'

import { StaticTokenDisplay } from './StaticTokenDisplay'
import { TokenDropdown } from './TokenDropdown'

type InputTokenSectionProps = {
  title: string
  tokenInfo: TokenInfo
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
  availableTokens?: TokenInfo[]
  onTokenChange?: (token: TokenInfo) => void
  hideTokenDisplay?: boolean
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
  onTokenChange,
  hideTokenDisplay = false
}: InputTokenSectionProps) => {
  const { symbol, isStablecoin } = tokenInfo
  const [localAmount, setLocalAmount] = useState(amount || '')

  const { formattedAvailableBalance } = useTokenAmountFormatting({
    amount,
    availableBalance,
    exchangeRate,
    isStablecoin: !!isStablecoin,
    decimals: tokenInfo.decimals,
    placeholder
  })

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

        {formattedAvailableBalance ? (
          <Flex alignItems='center' gap='xs'>
            <TokenIcon
              logoURI={tokenInfo.logoURI}
              icon={tokenInfo.icon}
              size='s'
              hex
            />
            <Text variant='body' size='m' strength='strong'>
              {messages.formattedAvailableBalance(
                formattedAvailableBalance,
                symbol,
                !!isStablecoin
              )}
            </Text>
            <Tooltip text={messages.availableBalanceTooltip} mount='body'>
              <IconInfo color='subdued' size='s' />
            </Tooltip>
          </Flex>
        ) : null}
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
