import { useMemo, useCallback } from 'react'

import { buySellMessages as messages } from '@audius/common/messages'
import {
  TokenAmountSectionProps,
  CoinInfo,
  useCoinAmountFormatting,
  BuySellTab
} from '@audius/common/store'
import {
  Button,
  Divider,
  Flex,
  IconTransaction,
  Text,
  TextInput,
  TokenAmountInput,
  TokenAmountInputChangeHandler,
  IconButton,
  TooltipPlacement
} from '@audius/harmony'
import { useTheme } from '@emotion/react'

import { TokenIcon } from './TokenIcon'
import { TooltipInfoIcon } from './TooltipInfoIcon'
import { TokenDropdown } from './components/TokenDropdown'

type BalanceSectionProps = {
  isStablecoin?: boolean
  formattedAvailableBalance: string | null
  tokenInfo: CoinInfo
  tooltipPlacement?: TooltipPlacement
  availableTokens?: CoinInfo[]
  onTokenChange?: (symbol: string) => void
  showReceiveAmount?: boolean
  formattedReceiveAmount?: string
}

const DefaultBalanceSection = ({
  isStablecoin,
  formattedAvailableBalance,
  tokenInfo,
  tooltipPlacement
}: BalanceSectionProps) => {
  const { cornerRadius } = useTheme()

  if (!formattedAvailableBalance) {
    return null
  }

  return (
    <Flex
      direction='column'
      alignItems='flex-end'
      justifyContent='center'
      gap='xs'
      flex={1}
      alignSelf='stretch'
    >
      <Flex alignItems='center' gap='xs'>
        <TokenIcon
          logoURI={tokenInfo.logoURI}
          icon={tokenInfo.icon}
          size='l'
          css={{ borderRadius: cornerRadius.circle }}
        />
        <Text variant='heading' size='s' color='subdued'>
          {messages.available}
        </Text>
        <TooltipInfoIcon
          ariaLabel='Available balance'
          placement={tooltipPlacement}
        />
      </Flex>
      <Text variant='heading' size='xl'>
        {isStablecoin ? '$' : ''}
        {formattedAvailableBalance}
      </Text>
    </Flex>
  )
}

const CryptoAmountSection = ({
  formattedAmount,
  tokenInfo,
  isStablecoin,
  priceDisplay,
  noPadding = false,
  verticalLayout = false
}: {
  formattedAmount: string
  tokenInfo: CoinInfo
  isStablecoin: boolean
  priceDisplay?: string
  noPadding?: boolean
  verticalLayout?: boolean
}) => {
  const { symbol } = tokenInfo
  const tokenTicker = messages.tokenTicker(symbol, !!isStablecoin)

  if (verticalLayout) {
    return (
      <Flex p={noPadding ? undefined : 'l'} alignItems='center' gap='s'>
        <TokenIcon
          logoURI={tokenInfo.logoURI}
          icon={tokenInfo.icon}
          size='4xl'
          hex
        />
        <Flex direction='column'>
          <Text variant='heading' size='l'>
            {formattedAmount}
          </Text>
          <Text variant='heading' size='s' color='subdued'>
            {tokenTicker}
          </Text>
          {priceDisplay && (
            <Text variant='heading' size='s' color='subdued'>
              {priceDisplay}
            </Text>
          )}
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex p={noPadding ? undefined : 'l'} alignItems='center' gap='s'>
      <TokenIcon
        logoURI={tokenInfo.logoURI}
        icon={tokenInfo.icon}
        size='4xl'
        hex
      />
      <Flex direction='column'>
        <Flex gap='xs' justifyContent='center' alignItems='center'>
          <Text variant='heading' size='l'>
            {formattedAmount}
          </Text>
          <Text variant='heading' size='l' color='subdued'>
            {tokenTicker}
          </Text>
        </Flex>
        {priceDisplay && (
          <Text variant='heading' size='s' color='subdued'>
            {priceDisplay}
          </Text>
        )}
      </Flex>
    </Flex>
  )
}

export const TokenAmountSection = ({
  title,
  tokenInfo,
  isInput,
  amount,
  onAmountChange,
  onMaxClick,
  availableBalance,
  exchangeRate,
  placeholder = '0.00',
  isDefault = true,
  error,
  errorMessage,
  tokenPrice,
  isTokenPriceLoading,
  tokenPriceDecimalPlaces = 2,
  tooltipPlacement,
  availableTokens,
  onTokenChange,
  tab,
  onChangeSwapDirection
}: TokenAmountSectionProps & {
  availableTokens?: CoinInfo[]
  onTokenChange?: (symbol: string) => void
  tab?: BuySellTab
}) => {
  const { spacing } = useTheme()

  const { symbol, isStablecoin } = tokenInfo

  const { formattedAvailableBalance, formattedAmount } =
    useCoinAmountFormatting({
      amount,
      availableBalance,
      exchangeRate,
      isStablecoin: !!isStablecoin,
      decimals: tokenInfo.decimals,
      placeholder
    })

  const priceDisplay =
    tokenPrice && !isTokenPriceLoading
      ? messages.tokenPrice(tokenPrice, tokenPriceDecimalPlaces)
      : undefined

  const handleTokenAmountChange: TokenAmountInputChangeHandler = useCallback(
    (value) => {
      onAmountChange?.(value)
    },
    [onAmountChange]
  )

  const youPaySection = useMemo(() => {
    return (
      <Flex gap='s' p='l' alignItems='flex-start'>
        <Flex direction='column' gap='xs' alignItems='flex-start'>
          <Flex alignItems='flex-start' gap='s'>
            {isStablecoin ? (
              <TextInput
                label={messages.amountInputLabel(symbol)}
                placeholder={placeholder}
                value={amount?.toString() || ''}
                onChange={(e) => onAmountChange?.(e.target.value)}
                error={error}
              />
            ) : (
              <TokenAmountInput
                label={messages.amountInputLabel(symbol)}
                placeholder={placeholder}
                value={amount?.toString() || ''}
                onChange={handleTokenAmountChange}
                tokenLabel={symbol}
                decimals={tokenInfo.decimals}
                error={error}
              />
            )}
            <Button
              variant='secondary'
              css={{
                height: spacing.unit16
              }}
              onClick={onMaxClick}
            >
              {messages.max}
            </Button>
          </Flex>
          {isInput && !!errorMessage ? (
            <Text size='xs' variant='body' color='danger'>
              {errorMessage}
            </Text>
          ) : null}
        </Flex>
        {isDefault ? (
          <DefaultBalanceSection
            isStablecoin={!!isStablecoin}
            formattedAvailableBalance={formattedAvailableBalance}
            tokenInfo={tokenInfo}
            tooltipPlacement={tooltipPlacement}
          />
        ) : (
          <TokenDropdown
            selectedToken={tokenInfo}
            availableTokens={availableTokens || []}
            onTokenChange={(token) => onTokenChange?.(token.symbol)}
          />
        )}
      </Flex>
    )
  }, [
    amount,
    error,
    errorMessage,
    formattedAvailableBalance,
    handleTokenAmountChange,
    isDefault,
    isInput,
    isStablecoin,
    onAmountChange,
    onMaxClick,
    placeholder,
    spacing,
    symbol,
    tokenInfo,
    tooltipPlacement,
    availableTokens,
    onTokenChange
  ])

  const youReceiveSection = useMemo(() => {
    if (!formattedAmount) {
      return null
    }

    if (isStablecoin && !availableTokens) {
      return (
        <Text variant='display' size='s'>
          {messages.tokenPrice(formattedAmount, 2)}
        </Text>
      )
    }

    // For convert flow, show the amount with token selection on the right
    if (!isDefault && availableTokens && onTokenChange) {
      return (
        <Flex p='l' alignItems='center' gap='s' justifyContent='space-between'>
          <TokenDropdown
            selectedToken={tokenInfo}
            availableTokens={availableTokens || []}
            onTokenChange={(token) => onTokenChange?.(token.symbol)}
          />
        </Flex>
      )
    }

    return (
      <CryptoAmountSection
        formattedAmount={formattedAmount}
        tokenInfo={tokenInfo}
        isStablecoin={!!isStablecoin}
        priceDisplay={priceDisplay}
      />
    )
  }, [
    formattedAmount,
    isStablecoin,
    priceDisplay,
    tokenInfo,
    isDefault,
    availableTokens,
    onTokenChange
  ])

  const titleText = useMemo(() => {
    if (isStablecoin && !isInput && !availableTokens) {
      return (
        <Flex alignItems='center' gap='s'>
          <TokenIcon
            logoURI={tokenInfo.logoURI}
            icon={tokenInfo.icon}
            size='l'
          />
          <Text variant='heading' size='s' color='subdued'>
            {title}
          </Text>
          <TooltipInfoIcon
            ariaLabel='You receive'
            placement={tooltipPlacement}
          />
        </Flex>
      )
    }

    // Add transaction icon for "You Receive" title in convert flow only
    if (!isInput && title === messages.youReceive && tab === 'convert') {
      return (
        <Flex alignItems='center' gap='s'>
          <IconButton
            icon={IconTransaction}
            size='s'
            color='subdued'
            onClick={onChangeSwapDirection}
            aria-label='Swap token direction'
          />

          <Text variant='heading' size='s' color='subdued'>
            {title}
          </Text>
        </Flex>
      )
    }

    return (
      <Text variant='heading' size='s' color='subdued'>
        {title}
      </Text>
    )
  }, [
    isStablecoin,
    isInput,
    availableTokens,
    title,
    tab,
    tokenInfo,
    tooltipPlacement,
    onChangeSwapDirection
  ])

  return (
    <Flex direction='column' gap='m'>
      <Flex alignItems='center' justifyContent='center' gap='m'>
        {titleText}
        <Divider css={{ flexGrow: 1 }} />
      </Flex>
      {isInput ? youPaySection : youReceiveSection}
    </Flex>
  )
}
