import { useMemo, useRef } from 'react'

import { buySellMessages } from '@audius/common/messages'
import { BuySellTab, CoinInfo, useCoinSwapForm } from '@audius/common/store'
import { Flex, Skeleton } from '@audius/harmony'
import { Form, FormikProvider } from 'formik'

import { TokenAmountSection } from './TokenAmountSection'
import type {
  InputConfiguration,
  SwapCallbacks,
  TokenPricing,
  TokenSelection,
  UIConfiguration
} from './types'

const messages = {
  ...buySellMessages,
  placeholder: '0.00'
}

const TokenSectionSkeleton = ({ title }: { title: string }) => (
  <Flex direction='column' gap='s'>
    <Skeleton h='xl' w={title === 'input' ? 'unit20' : 'unit24'} />
    <Skeleton h='unit14' w='100%' />
  </Flex>
)

const SwapFormSkeleton = () => (
  <Flex direction='column'>
    <TokenSectionSkeleton title='input' />
    <TokenSectionSkeleton title='output' />
  </Flex>
)

export type SwapTabProps = {
  inputToken: CoinInfo
  outputToken: CoinInfo
  outputBalance?: number
  inputIsDefault?: boolean
  outputIsDefault?: boolean
  tab?: BuySellTab
  onChangeSwapDirection?: () => void
  initialTicker?: string
} & TokenPricing &
  UIConfiguration &
  InputConfiguration &
  TokenSelection &
  SwapCallbacks

export const SwapTab = ({
  inputToken,
  outputToken,
  min,
  max,
  onTransactionDataChange,
  isDefault = true,
  inputIsDefault,
  outputIsDefault,
  tab,
  error,
  errorMessage,
  tokenPrice,
  isTokenPriceLoading,
  tokenPriceDecimalPlaces = 2,
  tooltipPlacement,
  initialInputValue,
  onInputValueChange,
  availableInputTokens,
  availableOutputTokens,
  onInputTokenChange,
  onOutputTokenChange,
  outputBalance,
  onChangeSwapDirection,
  initialTicker
}: SwapTabProps) => {
  // If initialTicker is provided, try to find the token and use it as the output token
  const resolvedOutputToken = useMemo(() => {
    if (initialTicker && availableOutputTokens) {
      const tokenByTicker = availableOutputTokens.find(
        (token) => token.symbol === initialTicker
      )
      if (tokenByTicker) {
        return tokenByTicker
      }
    }
    return outputToken
  }, [initialTicker, availableOutputTokens, outputToken])

  const {
    formik,
    inputAmount,
    outputAmount,
    isExchangeRateLoading,
    isBalanceLoading,
    availableBalance,
    currentExchangeRate,
    displayExchangeRate,
    handleInputAmountChange,
    handleMaxClick
  } = useCoinSwapForm({
    inputCoin: inputToken,
    outputCoin: resolvedOutputToken,
    min,
    max,
    onTransactionDataChange,
    initialInputValue,
    onInputValueChange
  })

  // Track if an exchange rate has ever been successfully fetched
  const hasRateEverBeenFetched = useRef(false)
  const hasDisplayRateEverBeenFetched = useRef(false)

  if (currentExchangeRate !== null) {
    hasRateEverBeenFetched.current = true
  }

  if (displayExchangeRate !== null) {
    hasDisplayRateEverBeenFetched.current = true
  }

  // Show initial loading state if balance is loading,
  // OR if exchange rate is loading AND we've never fetched a rate before.
  const isInitialLoading =
    isBalanceLoading ||
    (isExchangeRateLoading && !hasRateEverBeenFetched.current)

  // Determine isDefault values for input and output sections
  const inputSectionIsDefault =
    inputIsDefault !== undefined ? inputIsDefault : isDefault
  const outputSectionIsDefault =
    outputIsDefault !== undefined ? outputIsDefault : isDefault

  return (
    <FormikProvider value={formik}>
      <Form>
        <Flex direction='column'>
          {isInitialLoading ? (
            <SwapFormSkeleton />
          ) : (
            <>
              <TokenAmountSection
                title={messages.youPay}
                tokenInfo={inputToken}
                isInput={true}
                amount={inputAmount}
                onAmountChange={handleInputAmountChange}
                onMaxClick={handleMaxClick}
                availableBalance={availableBalance}
                placeholder={messages.placeholder}
                isDefault={inputSectionIsDefault}
                error={error}
                errorMessage={errorMessage}
                tooltipPlacement={tooltipPlacement}
                availableTokens={
                  !inputSectionIsDefault ? availableInputTokens : undefined
                }
                onTokenChange={
                  !inputSectionIsDefault ? onInputTokenChange : undefined
                }
                onChangeSwapDirection={onChangeSwapDirection}
              />

              <TokenAmountSection
                title={messages.youReceive}
                tokenInfo={resolvedOutputToken}
                isInput={false}
                amount={outputAmount}
                availableBalance={outputBalance ?? 0}
                exchangeRate={currentExchangeRate}
                tokenPrice={tokenPrice}
                isTokenPriceLoading={isTokenPriceLoading}
                tokenPriceDecimalPlaces={tokenPriceDecimalPlaces}
                tooltipPlacement={tooltipPlacement}
                isDefault={outputSectionIsDefault}
                tab={tab}
                availableTokens={
                  !outputSectionIsDefault ? availableOutputTokens : undefined
                }
                onTokenChange={
                  !outputSectionIsDefault ? onOutputTokenChange : undefined
                }
                onChangeSwapDirection={onChangeSwapDirection}
              />
            </>
          )}
        </Flex>
      </Form>
    </FormikProvider>
  )
}
