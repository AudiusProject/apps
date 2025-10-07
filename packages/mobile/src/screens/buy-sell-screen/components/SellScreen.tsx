import React, { useRef } from 'react'

import { useArtistCoin } from '@audius/common/api'
import type { TokenInfo, TokenPair } from '@audius/common/store'
import { useTokenSwapForm } from '@audius/common/store'

import { Box, Flex, Skeleton } from '@audius/harmony-native'
import { BuySellTerms } from 'app/components/buy-sell/BuySellTerms'
import { InputTokenSection } from 'app/components/buy-sell/InputTokenSection'
import { OutputTokenSection } from 'app/components/buy-sell/OutputTokenSection'

const messages = {
  youSell: 'You Sell'
}

const YouPaySkeleton = () => (
  <Flex column gap='s'>
    <Flex row justifyContent='space-between' alignItems='flex-start'>
      <Box h='xl' w='unit24'>
        <Skeleton />
      </Box>
      <Box h='xl' w={160}>
        <Skeleton />
      </Box>
    </Flex>
    <Box h='4xl' w='100%'>
      <Skeleton />
    </Box>
    <Box h='4xl' w='100%'>
      <Skeleton />
    </Box>
  </Flex>
)

const YouReceiveSkeleton = () => (
  <Flex column gap='s'>
    <Box h='xl' w='5xl'>
      <Skeleton />
    </Box>
    <Box h='4xl' w='100%'>
      <Skeleton />
    </Box>
  </Flex>
)

const SwapFormSkeleton = () => (
  <Flex column gap='xl'>
    <YouPaySkeleton />
    <YouReceiveSkeleton />
  </Flex>
)

type SellScreenProps = {
  tokenPair: TokenPair
  onTransactionDataChange?: (data: {
    inputAmount: number
    outputAmount: number
    isValid: boolean
    error: string | null
    isInsufficientBalance: boolean
  }) => void
  error?: boolean
  errorMessage?: string
  initialInputValue?: string
  onInputValueChange?: (value: string) => void
  onInputTokenChange?: (token: TokenInfo) => void
  availableInputTokens?: TokenInfo[]
}

export const SellScreen = ({
  tokenPair,
  onTransactionDataChange,
  error,
  errorMessage,
  initialInputValue,
  onInputValueChange,
  onInputTokenChange,
  availableInputTokens
}: SellScreenProps) => {
  const { data: tokenPriceData } = useArtistCoin(tokenPair?.baseToken?.address)

  const tokenPrice = tokenPriceData?.price?.toString() ?? null

  const {
    inputAmount,
    outputAmount,
    isExchangeRateLoading,
    isBalanceLoading,
    availableBalance,
    currentExchangeRate,
    handleInputAmountChange,
    handleOutputAmountChange,
    handleMaxClick
  } = useTokenSwapForm({
    inputToken: tokenPair?.baseToken,
    outputToken: tokenPair?.quoteToken,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange
  })

  // Track if an exchange rate has ever been successfully fetched
  const hasRateEverBeenFetched = useRef(false)
  if (currentExchangeRate !== null) {
    hasRateEverBeenFetched.current = true
  }

  if (!tokenPair) return null

  // Extract the tokens from the pair
  const { baseToken, quoteToken } = tokenPair

  // Show initial loading state if balance is loading,
  // OR if exchange rate is loading AND we've never fetched a rate before.
  const isInitialLoading =
    isBalanceLoading ||
    (isExchangeRateLoading && !hasRateEverBeenFetched.current)

  return (
    <Flex column gap='xl'>
      {isInitialLoading ? (
        <SwapFormSkeleton />
      ) : (
        <>
          <InputTokenSection
            title={messages.youSell}
            tokenInfo={baseToken}
            amount={inputAmount}
            onAmountChange={handleInputAmountChange}
            onMaxClick={handleMaxClick}
            availableBalance={availableBalance}
            error={error}
            errorMessage={errorMessage}
            availableTokens={availableInputTokens}
            onTokenChange={onInputTokenChange}
          />
          <OutputTokenSection
            tokenInfo={quoteToken}
            amount={outputAmount}
            onAmountChange={handleOutputAmountChange}
            availableBalance={0}
            exchangeRate={currentExchangeRate}
            tokenPrice={tokenPrice}
            isTokenPriceLoading={false}
            tokenPriceDecimalPlaces={2}
          />
          <BuySellTerms />
        </>
      )}
    </Flex>
  )
}
