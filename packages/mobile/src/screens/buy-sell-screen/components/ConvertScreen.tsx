import React, { useCallback, useMemo, useRef } from 'react'

import {
  transformArtistCoinsToTokenInfoMap,
  useArtistCoin,
  useArtistCoins
} from '@audius/common/api'
import { buySellMessages } from '@audius/common/messages'
import type { TokenInfo, TokenPair } from '@audius/common/store'
import { useTokenSwapForm } from '@audius/common/store'
import { getCurrencyDecimalPlaces } from '@audius/common/utils'

import {
  Box,
  Flex,
  IconButton,
  IconTransaction,
  Skeleton,
  Divider
} from '@audius/harmony-native'
import { BuySellTerms } from 'app/components/buy-sell/BuySellTerms'
import { InputTokenSection } from 'app/components/buy-sell/InputTokenSection'
import { OutputTokenSection } from 'app/components/buy-sell/OutputTokenSection'

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

type ConvertScreenProps = {
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
  availableInputTokens?: TokenInfo[]
  availableOutputTokens?: TokenInfo[]
  onInputTokenChange?: (symbol: string) => void
  onOutputTokenChange?: (symbol: string) => void
  onChangeSwapDirection?: () => void
}

export const ConvertScreen = ({
  tokenPair,
  onTransactionDataChange,
  error,
  errorMessage,
  initialInputValue,
  onInputValueChange,
  availableInputTokens,
  availableOutputTokens,
  onInputTokenChange,
  onOutputTokenChange,
  onChangeSwapDirection
}: ConvertScreenProps) => {
  const { baseToken, quoteToken } = tokenPair

  // Use tokens from the tokenPair prop instead of local state
  const selectedInputToken = baseToken
  const selectedOutputToken = quoteToken

  const { data: tokenPriceData, isPending: isTokenPriceLoading } =
    useArtistCoin(selectedOutputToken?.address ?? '')

  const decimalPlaces = useMemo(() => {
    if (!tokenPriceData?.price) return 2
    return getCurrencyDecimalPlaces(tokenPriceData.price)
  }, [tokenPriceData?.price])

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
    inputToken: selectedInputToken,
    outputToken: selectedOutputToken,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange
  })

  const { data: coins } = useArtistCoins()
  const artistCoins: TokenInfo[] = useMemo(() => {
    return Object.values(transformArtistCoinsToTokenInfoMap(coins ?? []))
  }, [coins])

  const totalAvailableTokens = useMemo(() => {
    return [...(availableOutputTokens ?? []), ...artistCoins].filter(
      (token, index, arr) =>
        arr.findIndex((t) => t.symbol === token.symbol) === index
    ) // Remove duplicates
  }, [availableOutputTokens, artistCoins])

  // Filter out the currently selected input token from available output tokens
  const filteredAvailableOutputTokens = useMemo(() => {
    return totalAvailableTokens.filter(
      (token) => token.symbol !== selectedInputToken?.symbol
    )
  }, [totalAvailableTokens, selectedInputToken?.symbol])

  const handleInputTokenChange = useCallback(
    (token: TokenInfo) => {
      onInputTokenChange?.(token.symbol)

      // If there are only 2 total available tokens, automatically set the other token
      if (totalAvailableTokens.length === 2) {
        const otherToken = totalAvailableTokens.find(
          (t) => t.symbol !== token.symbol
        )
        if (otherToken) {
          onOutputTokenChange?.(otherToken.symbol)
        }
      }
    },
    [onInputTokenChange, onOutputTokenChange, totalAvailableTokens]
  )

  const handleOutputTokenChange = useCallback(
    (token: TokenInfo) => {
      onOutputTokenChange?.(token.symbol)

      // If there are only 2 total available tokens, automatically set the other token
      if (totalAvailableTokens.length === 2) {
        const otherToken = totalAvailableTokens.find(
          (t) => t.symbol !== token.symbol
        )
        if (otherToken) {
          onInputTokenChange?.(otherToken.symbol)
        }
      }
    },
    [onInputTokenChange, onOutputTokenChange, totalAvailableTokens]
  )

  // Track if an exchange rate has ever been successfully fetched
  const hasRateEverBeenFetched = useRef(false)
  if (currentExchangeRate !== null) {
    hasRateEverBeenFetched.current = true
  }

  if (!tokenPair) return null

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
            title={buySellMessages.youPay}
            tokenInfo={selectedInputToken}
            amount={inputAmount}
            onAmountChange={handleInputAmountChange}
            onMaxClick={handleMaxClick}
            availableBalance={availableBalance}
            error={error}
            errorMessage={errorMessage}
            availableTokens={availableInputTokens}
            onTokenChange={handleInputTokenChange}
          />

          {/* Swap Direction Divider */}
          <Flex alignItems='center' justifyContent='center' gap='s' w='100%'>
            <Flex flex={1}>
              <Divider />
            </Flex>
            <IconButton
              icon={IconTransaction}
              size='s'
              color='subdued'
              onPress={onChangeSwapDirection}
              iconStyle={{ transform: [{ rotate: '90deg' }] }}
            />
            <Flex flex={1}>
              <Divider />
            </Flex>
          </Flex>

          <OutputTokenSection
            tokenInfo={selectedOutputToken}
            amount={outputAmount}
            onAmountChange={handleOutputAmountChange}
            availableBalance={0}
            exchangeRate={currentExchangeRate}
            tokenPrice={tokenPriceData?.price.toString() ?? null}
            isTokenPriceLoading={isTokenPriceLoading}
            tokenPriceDecimalPlaces={decimalPlaces}
            availableTokens={filteredAvailableOutputTokens}
            onTokenChange={handleOutputTokenChange}
          />
          <BuySellTerms />
        </>
      )}
    </Flex>
  )
}
