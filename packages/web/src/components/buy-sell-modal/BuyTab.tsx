import { useEffect, useMemo, useRef, useState } from 'react'

import {
  transformArtistCoinsToTokenInfoMap,
  useArtistCoin,
  useArtistCoins
} from '@audius/common/api'
import { buySellMessages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import type { TokenInfo } from '@audius/common/store'
import { useTokenSwapForm } from '@audius/common/store'
import { getCurrencyDecimalPlaces } from '@audius/common/utils'
import { Flex } from '@audius/harmony'

import { useFlag } from 'hooks/useRemoteConfig'

import { BuySellTerms } from './components/BuySellTerms'
import { InputTokenSection } from './components/InputTokenSection'
import { OutputTokenSection } from './components/OutputTokenSection'
import { TabContentSkeleton } from './components/SwapSkeletons'
import type { BuyTabProps } from './types'

export const BuyTab = ({
  tokenPair,
  onTransactionDataChange,
  error,
  errorMessage,
  initialInputValue,
  onInputValueChange,
  availableOutputTokens,
  onOutputTokenChange
}: BuyTabProps) => {
  const { baseToken, quoteToken } = tokenPair
  const { isEnabled: isArtistCoinsEnabled } = useFlag(FeatureFlags.ARTIST_COINS)

  const [selectedOutputToken, setSelectedOutputToken] = useState(baseToken)

  // Sync selectedOutputToken with baseToken when tokenPair changes
  useEffect(() => {
    setSelectedOutputToken((prev) =>
      prev?.symbol === baseToken.symbol ? prev : baseToken
    )
  }, [baseToken.symbol, baseToken])

  const { data: tokenPriceData, isPending: isTokenPriceLoading } =
    useArtistCoin(selectedOutputToken.address)

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
    inputToken: quoteToken,
    outputToken: selectedOutputToken,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange
  })

  const { data: coins } = useArtistCoins()
  const artistCoins: TokenInfo[] = useMemo(() => {
    return Object.values(transformArtistCoinsToTokenInfoMap(coins ?? []))
  }, [coins])

  // Token change handlers
  const handleOutputTokenChange = (token: TokenInfo) => {
    setSelectedOutputToken(token)
    onOutputTokenChange?.(token.symbol)
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
          <InputTokenSection
            title={buySellMessages.youPay}
            tokenInfo={quoteToken}
            amount={inputAmount}
            onAmountChange={handleInputAmountChange}
            onMaxClick={handleMaxClick}
            availableBalance={availableBalance}
            error={error}
            errorMessage={errorMessage}
            hideTokenDisplay={true}
          />
          <OutputTokenSection
            tokenInfo={selectedOutputToken}
            amount={outputAmount}
            onAmountChange={handleOutputAmountChange}
            availableBalance={0}
            exchangeRate={currentExchangeRate}
            tokenPrice={tokenPriceData?.price.toString() ?? null}
            isTokenPriceLoading={isTokenPriceLoading}
            tokenPriceDecimalPlaces={decimalPlaces}
            availableTokens={artistCoins}
            onTokenChange={handleOutputTokenChange}
            isArtistCoinsEnabled={isArtistCoinsEnabled}
          />
          <BuySellTerms />
        </>
      )}
    </Flex>
  )
}
