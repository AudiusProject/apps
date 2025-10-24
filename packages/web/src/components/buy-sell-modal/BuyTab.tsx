import { useEffect, useMemo, useRef, useState } from 'react'

import {
  TEMP_ARTIST_COINS_PAGE_SIZE,
  transformArtistCoinsToTokenInfoMap,
  useArtistCoin,
  useArtistCoins,
  useCurrentAccountUser
} from '@audius/common/api'
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
import type { BuyTabProps } from './types'

export const BuyTab = ({
  tokenPair,
  onTransactionDataChange,
  error,
  errorMessage,
  initialInputValue,
  onInputValueChange,
  onOutputTokenChange
}: BuyTabProps) => {
  const { baseToken, quoteToken } = tokenPair

  const { data: currentUser } = useCurrentAccountUser()
  const isAnonymousUser = !currentUser
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
    inputCoin: quoteToken,
    outputCoin: selectedOutputToken,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange,
    externalWalletAddress: externalWalletAccount?.address
  })

  const { data: coins } = useArtistCoins({
    pageSize: TEMP_ARTIST_COINS_PAGE_SIZE
  })
  const artistCoins: CoinInfo[] = useMemo(() => {
    return Object.values(transformArtistCoinsToTokenInfoMap(coins ?? []))
  }, [coins])

  // Token change handlers
  const handleOutputTokenChange = (token: CoinInfo) => {
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
    (!isAnonymousUser && isBalanceLoading) ||
    (isExchangeRateLoading && !hasRateEverBeenFetched.current)

  return (
    <Flex direction='column' gap='xl'>
      {isInitialLoading ? (
        <TabContentSkeleton />
      ) : (
        <>
          <CurrentWalletBanner
            inputToken={{
              mint: quoteToken.address,
              symbol: quoteToken.symbol
            }}
          />
          <InputTokenSection
            title={buySellMessages.youPay}
            tokenInfo={quoteToken}
            amount={inputAmount}
            onAmountChange={handleInputAmountChange}
            onMaxClick={handleMaxClick}
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
          />
          <BuySellTerms />
        </>
      )}
    </Flex>
  )
}
