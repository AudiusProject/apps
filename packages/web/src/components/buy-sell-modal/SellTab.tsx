import { useEffect, useMemo, useRef, useState } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { buySellMessages } from '@audius/common/messages'
import type { TokenInfo } from '@audius/common/store'
import { useTokenSwapForm } from '@audius/common/store'
import { getCurrencyDecimalPlaces } from '@audius/common/utils'
import { Flex } from '@audius/harmony'

import { InputTokenSection } from './components/InputTokenSection'
import { OutputTokenSection } from './components/OutputTokenSection'
import { SwapFormSkeleton } from './components/SwapSkeletons'
import type { SellTabProps } from './types'

export const SellTab = ({
  tokenPair,
  onTransactionDataChange,
  error,
  errorMessage,
  initialInputValue,
  onInputValueChange,
  availableInputTokens,
  onInputTokenChange
}: SellTabProps) => {
  const { baseToken, quoteToken } = tokenPair

  // State for token selection
  const [selectedInputToken, setSelectedInputToken] = useState(baseToken)

  useEffect(() => {
    setSelectedInputToken((prev) =>
      prev?.symbol === baseToken.symbol ? prev : baseToken
    )
  }, [baseToken.symbol, baseToken])

  const { data: tokenPriceData, isPending: isTokenPriceLoading } =
    useArtistCoin(selectedInputToken.address)

  const tokenPrice = tokenPriceData?.price?.toString() ?? null

  const decimalPlaces = useMemo(() => {
    if (!tokenPrice) return 2
    return getCurrencyDecimalPlaces(parseFloat(tokenPrice))
  }, [tokenPrice])

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
    outputToken: quoteToken,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange
  })

  // Token change handlers
  const handleInputTokenChange = (token: TokenInfo) => {
    setSelectedInputToken(token)
    onInputTokenChange?.(token.symbol)
  }

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
    <Flex direction='column' gap='xl'>
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
          <OutputTokenSection
            tokenInfo={quoteToken}
            amount={outputAmount}
            onAmountChange={handleOutputAmountChange}
            availableBalance={0}
            exchangeRate={currentExchangeRate}
            tokenPrice={tokenPrice}
            isTokenPriceLoading={isTokenPriceLoading}
            tokenPriceDecimalPlaces={decimalPlaces}
            hideTokenDisplay={true} // Hide token display completely in sell tab output
          />
        </>
      )}
    </Flex>
  )
}
