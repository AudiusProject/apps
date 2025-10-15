import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useArtistCoin, useTokenPair, useTokens } from '@audius/common/api'
import { useBuySellAnalytics, useOwnedTokens } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import type { BuySellTab, TokenInfo } from '@audius/common/store'
import {
  AUDIO_TICKER,
  getSwapTokens,
  useAddCashModal,
  useBuySellScreen,
  useBuySellSwap,
  useBuySellTabs,
  buySellTabsArray,
  useBuySellTokenFilters,
  useBuySellTransactionData,
  useCurrentTokenPair,
  useSafeTokenPair,
  useSwapDisplayData,
  useTokenStates
} from '@audius/common/store'
import { useFocusEffect } from '@react-navigation/native'
import { InteractionManager, Keyboard } from 'react-native'

import { Button, Flex, Hint, TextLink } from '@audius/harmony-native'
import { SegmentedControl } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

import { BuyScreen, ConvertScreen, SellScreen } from './components'

type BuySellFlowProps = {
  onClose: () => void
  initialTab?: BuySellTab
  coinTicker?: string
}

export const BuySellFlow = ({
  onClose,
  initialTab = 'buy',
  coinTicker = AUDIO_TICKER
}: BuySellFlowProps) => {
  const navigation = useNavigation()
  const { onOpen: openAddCashModal } = useAddCashModal()
  const { trackSwapRequested, trackAddFundsClicked } = useBuySellAnalytics()

  // Get token pair for the initial coin, fallback to AUDIO/USDC
  const { data: selectedPair } = useTokenPair({
    baseSymbol: coinTicker,
    quoteSymbol: 'USDC'
  })

  const { currentScreen, setCurrentScreen } = useBuySellScreen({
    initialScreen: 'input'
  })

  const {
    transactionData,
    hasSufficientBalance,
    handleTransactionDataChange,
    resetTransactionData
  } = useBuySellTransactionData()

  const { activeTab, handleActiveTabChange } = useBuySellTabs({
    setCurrentScreen,
    resetTransactionData,
    initialTab
  })

  const handleTabChange = (newTab: BuySellTab) => {
    handleActiveTabChange(newTab)
    // Dismiss keyboard in case we were focused on an input
    InteractionManager.runAfterInteractions(() => {
      Keyboard.dismiss()
    })
  }

  // Use custom hooks for token state management
  const {
    getCurrentTabTokens,
    handleInputTokenChange: handleInputTokenChangeInternal,
    handleOutputTokenChange: handleOutputTokenChangeInternal,
    handleSwapDirection
  } = useTokenStates(selectedPair)

  // Get current tab's token symbols
  const currentTabTokens = getCurrentTabTokens(activeTab)
  const baseTokenSymbol = currentTabTokens.baseToken
  const quoteTokenSymbol = currentTabTokens.quoteToken

  const { tokens, isLoading: tokensLoading } = useTokens()

  // Get all available tokens
  const availableTokens: TokenInfo[] = useMemo(() => {
    return tokensLoading ? [] : Object.values(tokens)
  }, [tokens, tokensLoading])

  const { ownedTokens } = useOwnedTokens(availableTokens)

  // Create a helper to check if user has positive balance for a token
  const hasPositiveBalance = useCallback(
    (tokenAddress: string): boolean => {
      return ownedTokens.some((token) => token.address === tokenAddress)
    },
    [ownedTokens]
  )

  // Use shared token filtering logic
  const {
    availableInputTokensForSell,
    availableInputTokensForConvert,
    availableOutputTokensForConvert
  } = useBuySellTokenFilters({
    availableTokens,
    baseTokenSymbol,
    quoteTokenSymbol,
    hasPositiveBalance
  })

  // Reset screen state to 'input' when this screen comes into focus
  // This handles the case where we navigate back from ConfirmSwapScreen
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('input')
    }, [setCurrentScreen])
  )

  // Persistent state for each tab's input values
  const [tabInputValues, setTabInputValues] = useState<
    Record<BuySellTab, string>
  >({
    buy: '',
    sell: '',
    convert: ''
  })

  // Update input value for buy tab
  const handleBuyInputValueChange = (value: string) => {
    setTabInputValues((prev) => ({
      ...prev,
      buy: value
    }))
  }

  // Update input value for sell tab
  const handleSellInputValueChange = (value: string) => {
    setTabInputValues((prev) => ({
      ...prev,
      sell: value
    }))
  }

  // Update input value for convert tab
  const handleConvertInputValueChange = (value: string) => {
    setTabInputValues((prev) => ({
      ...prev,
      convert: value
    }))
  }

  // Handle token changes with transaction reset
  const handleInputTokenChange = useCallback(
    (symbol: string) => {
      handleInputTokenChangeInternal(symbol, activeTab)
      resetTransactionData()
    },
    [handleInputTokenChangeInternal, activeTab, resetTransactionData]
  )

  const handleOutputTokenChange = useCallback(
    (symbol: string) => {
      handleOutputTokenChangeInternal(symbol, activeTab)
      resetTransactionData()
    },
    [handleOutputTokenChangeInternal, activeTab, resetTransactionData]
  )

  // Handle swap direction change for convert tab
  const handleChangeSwapDirection = useCallback(() => {
    handleSwapDirection(activeTab)
    resetTransactionData()
  }, [handleSwapDirection, activeTab, resetTransactionData])

  // Get token pair for the current tab's tokens using the same approach as web
  const currentTabTokenPair = useCurrentTokenPair({
    baseTokenSymbol,
    quoteTokenSymbol,
    availableTokens,
    selectedPair
  })

  // Use shared safe token pair logic
  const safeSelectedPair = useSafeTokenPair(currentTabTokenPair)

  const { handleShowConfirmation, isContinueButtonLoading } = useBuySellSwap({
    transactionData,
    currentScreen,
    setCurrentScreen,
    activeTab,
    selectedPair: safeSelectedPair,
    onClose
  })

  // Track if user has attempted to submit the form
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const swapTokens = useMemo(
    () => getSwapTokens(activeTab, safeSelectedPair),
    [activeTab, safeSelectedPair]
  )

  const currentExchangeRate = useMemo(
    () => transactionData?.exchangeRate ?? undefined,
    [transactionData?.exchangeRate]
  )

  const { confirmationScreenData } = useSwapDisplayData({
    swapStatus: null, // Not needed in this component
    currentScreen,
    transactionData,
    swapResult: null, // Not needed in this component
    activeTab,
    selectedPair: safeSelectedPair
  })

  const { data: outputCoin } = useArtistCoin(
    swapTokens.outputTokenInfo?.address
  )
  const pricePerBaseToken = useMemo(() => {
    return outputCoin?.price
      ? outputCoin?.price
      : (outputCoin?.dynamicBondingCurve.priceUSD ?? 0)
  }, [outputCoin])

  const handleContinueClick = useCallback(() => {
    setHasAttemptedSubmit(true)
    if (
      transactionData?.isValid &&
      !isContinueButtonLoading &&
      !transactionData?.isExchangeRateLoading
    ) {
      trackSwapRequested({
        activeTab,
        inputToken: swapTokens.inputToken,
        outputToken: swapTokens.outputToken,
        inputAmount: transactionData.inputAmount,
        outputAmount: transactionData.outputAmount,
        exchangeRate: currentExchangeRate
      })

      handleShowConfirmation()

      // Navigate to confirmation screen with the data
      if (confirmationScreenData) {
        navigation.navigate('ConfirmSwapScreen', {
          confirmationData: confirmationScreenData,
          activeTab,
          selectedPair: safeSelectedPair,
          pricePerBaseToken
        })
      }
    }
  }, [
    transactionData?.isValid,
    transactionData?.inputAmount,
    transactionData?.outputAmount,
    transactionData?.isExchangeRateLoading,
    isContinueButtonLoading,
    trackSwapRequested,
    activeTab,
    swapTokens.inputToken,
    swapTokens.outputToken,
    currentExchangeRate,
    handleShowConfirmation,
    confirmationScreenData,
    navigation,
    safeSelectedPair,
    pricePerBaseToken
  ])

  useEffect(() => {
    setHasAttemptedSubmit(false)
  }, [activeTab])

  const isTransactionInvalid = !transactionData?.isValid

  const displayErrorMessage = useMemo(() => {
    if (
      activeTab === 'sell' &&
      !hasSufficientBalance &&
      !!tabInputValues.sell
    ) {
      return messages.insufficientAUDIOForSale
    }
    // Prioritize the specific validation error from the form
    if (hasAttemptedSubmit && transactionData?.error) {
      return transactionData.error
    }
    // Fallback for empty input
    if (
      hasAttemptedSubmit &&
      isTransactionInvalid &&
      !(activeTab === 'buy' && !hasSufficientBalance)
    ) {
      return messages.emptyAmount
    }
    return undefined
  }, [
    activeTab,
    hasSufficientBalance,
    hasAttemptedSubmit,
    isTransactionInvalid,
    tabInputValues,
    transactionData
  ])

  const handleAddCash = useCallback(() => {
    openAddCashModal({
      isOpen: true,
      portalHostName: 'BuySellModalScreenDrawerPortal'
    })
    trackAddFundsClicked('insufficient_balance_hint')
  }, [openAddCashModal, trackAddFundsClicked])

  const shouldShowError =
    !!displayErrorMessage ||
    (activeTab === 'buy' && !hasSufficientBalance && !!tabInputValues.buy)

  return {
    content: (
      <Flex direction='column' gap='xl'>
        {/* Tab Control */}
        <Flex alignItems='center' justifyContent='center'>
          <SegmentedControl
            options={buySellTabsArray}
            selected={activeTab}
            onSelectOption={handleTabChange}
            fullWidth
          />
        </Flex>

        {/* Tab Content */}
        <Flex style={{ display: activeTab === 'buy' ? 'flex' : 'none' }}>
          {safeSelectedPair ? (
            <BuyScreen
              tokenPair={safeSelectedPair}
              onTransactionDataChange={
                activeTab === 'buy' ? handleTransactionDataChange : undefined
              }
              error={shouldShowError}
              errorMessage={displayErrorMessage}
              initialInputValue={tabInputValues.buy}
              onInputValueChange={handleBuyInputValueChange}
              onOutputTokenChange={(token) =>
                handleOutputTokenChange(token.symbol)
              }
            />
          ) : null}
        </Flex>
        <Flex style={{ display: activeTab === 'sell' ? 'flex' : 'none' }}>
          {safeSelectedPair ? (
            <SellScreen
              tokenPair={safeSelectedPair}
              onTransactionDataChange={
                activeTab === 'sell' ? handleTransactionDataChange : undefined
              }
              error={shouldShowError}
              errorMessage={displayErrorMessage}
              initialInputValue={tabInputValues.sell}
              onInputValueChange={handleSellInputValueChange}
              onInputTokenChange={(token) =>
                handleInputTokenChange(token.symbol)
              }
              availableInputTokens={availableInputTokensForSell}
            />
          ) : null}
        </Flex>
        <Flex style={{ display: activeTab === 'convert' ? 'flex' : 'none' }}>
          {safeSelectedPair ? (
            <ConvertScreen
              tokenPair={safeSelectedPair}
              onTransactionDataChange={
                activeTab === 'convert'
                  ? handleTransactionDataChange
                  : undefined
              }
              error={shouldShowError}
              errorMessage={displayErrorMessage}
              initialInputValue={tabInputValues.convert}
              onInputValueChange={handleConvertInputValueChange}
              availableInputTokens={availableInputTokensForConvert}
              availableOutputTokens={availableOutputTokensForConvert}
              onInputTokenChange={handleInputTokenChange}
              onOutputTokenChange={handleOutputTokenChange}
              onChangeSwapDirection={handleChangeSwapDirection}
            />
          ) : null}
        </Flex>

        {/* Insufficient Balance Message for Buy */}
        {activeTab === 'buy' &&
          !hasSufficientBalance &&
          !!tabInputValues.buy && (
            <Hint
              actions={
                <TextLink variant='visible' onPress={handleAddCash}>
                  {messages.addCash}
                </TextLink>
              }
            >
              {messages.insufficientUSDC}
            </Hint>
          )}
      </Flex>
    ),
    footer: (
      <Button
        variant='primary'
        fullWidth
        isLoading={
          isContinueButtonLoading || transactionData?.isExchangeRateLoading
        }
        disabled={transactionData?.isExchangeRateLoading}
        onPress={handleContinueClick}
      >
        {messages.continue}
      </Button>
    )
  }
}
