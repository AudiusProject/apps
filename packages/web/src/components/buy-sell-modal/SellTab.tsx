import { useEffect, useMemo, useRef, useState } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { buySellMessages } from '@audius/common/messages'
import type { CoinInfo } from '@audius/common/store'
import { useCoinSwapForm } from '@audius/common/store'
import { getCurrencyDecimalPlaces } from '@audius/common/utils'
import { Flex } from '@audius/harmony'

import { appkitModal } from 'app/ReownAppKitModal'

import { BuySellTerms } from './components/BuySellTerms'
import { CurrentWalletBanner } from './components/CurrentWalletBanner'
import { InputTokenSection } from './components/InputTokenSection'
import { OutputTokenSection } from './components/OutputTokenSection'
import { TabContentSkeleton } from './components/SwapSkeletons'
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

  const decimalPlaces = useMemo(() => {
    if (!tokenPriceData?.price) return 2
    return getCurrencyDecimalPlaces(tokenPriceData.price)
  }, [tokenPriceData?.price])

  const externalWalletAccount = appkitModal.getAccount('solana')

  const {
    inputAmount,
    outputAmount,
    isExchangeRateLoading,
    isBalanceLoading,
    currentExchangeRate,
    handleInputAmountChange,
    handleOutputAmountChange,
    handleMaxClick
  } = useCoinSwapForm({
    inputCoin: selectedInputToken,
    outputCoin: quoteToken,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange,
    externalWalletAddress: externalWalletAccount?.address
  })

  // Token change handlers
  const handleInputTokenChange = (token: CoinInfo) => {
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
        <TabContentSkeleton />
      ) : (
        <>
          <CurrentWalletBanner
            inputToken={{
              mint: selectedInputToken.address,
              symbol: selectedInputToken.symbol
            }}
          />
          <InputTokenSection
            title={buySellMessages.youPay}
            tokenInfo={selectedInputToken}
            amount={inputAmount}
            onAmountChange={handleInputAmountChange}
            onMaxClick={handleMaxClick}
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
            tokenPrice={tokenPriceData?.price.toString() ?? null}
            isTokenPriceLoading={isTokenPriceLoading}
            tokenPriceDecimalPlaces={decimalPlaces}
            hideTokenDisplay={true} // Hide token display completely in sell tab output
          />
          <BuySellTerms />
        </>
      )}
    </Flex>
  )
}
