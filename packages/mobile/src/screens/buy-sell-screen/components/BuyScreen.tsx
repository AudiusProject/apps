import React, { useMemo, useRef } from 'react'

import {
  transformArtistCoinsToTokenInfoMap,
  useArtistCoin,
  useArtistCoins
} from '@audius/common/api'
import { buySellMessages } from '@audius/common/messages'
import type { CoinInfo, CoinPair } from '@audius/common/store'
import { useCoinSwapForm } from '@audius/common/store'
import { getCurrencyDecimalPlaces } from '@audius/common/utils'

import { Box, Flex, Skeleton } from '@audius/harmony-native'
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

type BuyScreenProps = {
  tokenPair: CoinPair
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
  availableOutputTokens?: CoinInfo[]
  onOutputTokenChange?: (token: CoinInfo) => void
}

export const BuyScreen = ({
  tokenPair,
  onTransactionDataChange,
  error,
  errorMessage,
  initialInputValue,
  onInputValueChange,
  availableOutputTokens,
  onOutputTokenChange
}: BuyScreenProps) => {
  const { data: tokenPriceData, isPending: isTokenPriceLoading } =
    useArtistCoin(tokenPair?.baseToken?.address)

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
  } = useCoinSwapForm({
    inputCoin: tokenPair?.quoteToken,
    outputCoin: tokenPair?.baseToken,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange
  })

  const { data: coins } = useArtistCoins()
  const artistCoins: CoinInfo[] = useMemo(() => {
    return Object.values(transformArtistCoinsToTokenInfoMap(coins ?? []))
  }, [coins])

  // Track if an exchange rate has ever been successfully fetched
  const hasRateEverBeenFetched = useRef(false)
  if (currentExchangeRate !== null) {
    hasRateEverBeenFetched.current = true
  }

  if (!tokenPair) return null

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
            title={buySellMessages.youPay}
            tokenInfo={quoteToken}
            amount={inputAmount}
            onAmountChange={handleInputAmountChange}
            onMaxClick={handleMaxClick}
            availableBalance={availableBalance}
            error={error}
            errorMessage={errorMessage}
          />
          <OutputTokenSection
            tokenInfo={baseToken}
            amount={outputAmount}
            onAmountChange={handleOutputAmountChange}
            availableBalance={0}
            exchangeRate={currentExchangeRate}
            tokenPrice={tokenPriceData?.price.toString() ?? null}
            isTokenPriceLoading={isTokenPriceLoading}
            tokenPriceDecimalPlaces={decimalPlaces}
            availableTokens={availableOutputTokens ?? artistCoins}
            onTokenChange={onOutputTokenChange}
          />
          <BuySellTerms />
        </>
      )}
    </Flex>
  )
}
