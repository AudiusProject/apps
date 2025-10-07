import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
import { Divider, Flex, IconButton, IconTransaction } from '@audius/harmony'

import { useFlag } from 'hooks/useRemoteConfig'

import { BuySellTerms } from './components/BuySellTerms'
import { InputTokenSection } from './components/InputTokenSection'
import { OutputTokenSection } from './components/OutputTokenSection'
import { TabContentSkeleton } from './components/SwapSkeletons'
import { ConvertTabProps } from './types'

export const ConvertTab = ({
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
}: ConvertTabProps) => {
  const { baseToken, quoteToken } = tokenPair
  const { isEnabled: isArtistCoinsEnabled } = useFlag(FeatureFlags.ARTIST_COINS)

  // State for token selection
  const [selectedInputToken, setSelectedInputToken] = useState(baseToken)
  const [selectedOutputToken, setSelectedOutputToken] = useState(quoteToken)

  useEffect(() => {
    setSelectedInputToken(baseToken)
    setSelectedOutputToken(quoteToken)
  }, [baseToken, quoteToken])

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
      (token) => token.symbol !== selectedInputToken.symbol
    )
  }, [totalAvailableTokens, selectedInputToken.symbol])

  // Generic token change handler with automatic swapping when only 2 tokens are available
  const createTokenChangeHandler = useCallback(
    (
      primaryCallback: (token: TokenInfo) => void,
      secondaryCallback?: (token: TokenInfo) => void
    ) =>
      (token: TokenInfo) => {
        primaryCallback(token)

        // If there are only 2 total available tokens, automatically set the other token
        if (totalAvailableTokens.length === 2) {
          const otherToken = totalAvailableTokens.find(
            (t) => t.symbol !== token.symbol
          )
          if (otherToken && secondaryCallback) {
            secondaryCallback(otherToken)
          }
        }
      },
    [totalAvailableTokens]
  )

  const handleInputTokenChange = useMemo(
    () =>
      createTokenChangeHandler(
        (token) => {
          setSelectedInputToken(token)
          onInputTokenChange?.(token.symbol)
        },
        (token) => {
          setSelectedOutputToken(token)
          onOutputTokenChange?.(token.symbol)
        }
      ),
    [createTokenChangeHandler, onInputTokenChange, onOutputTokenChange]
  )

  const handleOutputTokenChange = useMemo(
    () =>
      createTokenChangeHandler(
        (token) => {
          setSelectedOutputToken(token)
          onOutputTokenChange?.(token.symbol)
        },
        (token) => {
          setSelectedInputToken(token)
          onInputTokenChange?.(token.symbol)
        }
      ),
    [createTokenChangeHandler, onInputTokenChange, onOutputTokenChange]
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
    <Flex direction='column' gap='xl'>
      {isInitialLoading ? (
        <TabContentSkeleton />
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
          <Flex alignItems='center' justifyContent='center' gap='s' w='full'>
            <Divider />
            <IconButton
              icon={IconTransaction}
              size='s'
              color='subdued'
              onClick={onChangeSwapDirection}
              aria-label='Swap token direction'
              css={{
                transform: 'rotate(90deg)',
                '&:hover svg': {
                  transform: 'rotate(90deg) scale(1.1)'
                },
                '&:active svg': {
                  transform: 'rotate(90deg) scale(0.98)'
                }
              }}
            />
            <Divider />
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
            isArtistCoinsEnabled={isArtistCoinsEnabled}
          />
          <BuySellTerms />
        </>
      )}
    </Flex>
  )
}
