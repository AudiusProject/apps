import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  SwapStatus,
  useArtistCoin,
  useTokenPair,
  useTokens
} from '@audius/common/api'
import { useBuySellAnalytics, useOwnedTokens } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import { ASSET_DETAIL_PAGE } from '@audius/common/src/utils/route'
import {
  BuySellTab,
  Screen,
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
import { Button, Flex, Hint, SegmentedControl, TextLink } from '@audius/harmony'
import { matchPath, useLocation } from 'react-router-dom'

import { ModalLoading } from 'components/modal-loading'
import { ToastContext } from 'components/toast/ToastContext'
import { getPathname } from 'utils/route'

import { BuyTab } from './BuyTab'
import { ConfirmSwapScreen } from './ConfirmSwapScreen'
import { ConvertTab } from './ConvertTab'
import { SellTab } from './SellTab'
import { TransactionSuccessScreen } from './TransactionSuccessScreen'
import { SwapFormSkeleton } from './components/SwapSkeletons'

type BuySellFlowProps = {
  onClose: () => void
  openAddCashModal: () => void
  onScreenChange: (screen: Screen) => void
  onLoadingStateChange?: (isLoading: boolean) => void
  initialTicker?: string
  initialTab?: BuySellTab
  setResetState: (resetState: () => void) => void
}

export const BuySellFlow = (props: BuySellFlowProps) => {
  const {
    onClose,
    openAddCashModal,
    onScreenChange,
    onLoadingStateChange,
    initialTicker,
    initialTab,
    setResetState
  } = props
  const { toast } = useContext(ToastContext)
  const {
    trackSwapRequested,
    trackSwapSuccess,
    trackSwapFailure,
    trackAddFundsClicked
  } = useBuySellAnalytics()

  // Get tokens from API
  const { tokens, isLoading: tokensLoading } = useTokens()

  const { currentScreen, setCurrentScreen } = useBuySellScreen({
    onScreenChange
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

  // Persistent state for each tab's input values
  const [tabInputValues, setTabInputValues] = useState<
    Record<BuySellTab, string>
  >({
    buy: '',
    sell: '',
    convert: ''
  })

  // Update input value for current tab
  const handleTabInputValueChange = (value: string) => {
    setTabInputValues((prev) => ({
      ...prev,
      [activeTab]: value
    }))
  }

  // Track if user has attempted to submit the form
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  // Track the last handled error to prevent duplicate toast messages
  const lastHandledErrorRef = useRef<string | null>(null)

  const location = useLocation()
  const pathname = getPathname(location)
  const match = matchPath<{ ticker: string }>(pathname, {
    path: ASSET_DETAIL_PAGE,
    exact: true
  })
  const { data: selectedPair } = useTokenPair({
    baseSymbol: initialTicker ?? match?.params.ticker ?? '',
    quoteSymbol: 'USDC'
  })

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

  // Handle token changes with transaction reset
  const handleInputTokenChange = (symbol: string) => {
    handleInputTokenChangeInternal(symbol, activeTab)
    resetTransactionData()
  }

  const handleOutputTokenChange = (symbol: string) => {
    handleOutputTokenChangeInternal(symbol, activeTab)
    resetTransactionData()
  }

  const handleChangeSwapDirection = () => {
    handleSwapDirection(activeTab)
    resetTransactionData()
  }

  // Get all available tokens (simplified since we have all tokens now)
  const availableTokens = useMemo(() => {
    return tokensLoading ? [] : Object.values(tokens)
  }, [tokens, tokensLoading])

  // Get tokens that user owns (includes USDC if user has balance)
  const { ownedTokens } = useOwnedTokens(availableTokens)

  // Create a helper to check if user has positive balance for a token
  const hasPositiveBalance = useCallback(
    (tokenAddress: string): boolean => {
      return ownedTokens.some((token) => token.address === tokenAddress)
    },
    [ownedTokens]
  )

  // Create current token pair based on selected base and quote tokens
  const currentTokenPair = useCurrentTokenPair({
    baseTokenSymbol,
    quoteTokenSymbol,
    availableTokens,
    selectedPair
  })

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

  // Use shared safe token pair logic
  const safeSelectedPair = useSafeTokenPair(currentTokenPair)

  const swapTokens = useMemo(() => {
    // Return safe defaults if currentTokenPair is not available
    if (!currentTokenPair?.baseToken || !currentTokenPair?.quoteToken) {
      return {
        inputToken: activeTab === 'buy' ? quoteTokenSymbol : baseTokenSymbol,
        outputToken: activeTab === 'buy' ? baseTokenSymbol : quoteTokenSymbol,
        inputTokenInfo: null,
        outputTokenInfo: null
      }
    }

    return {
      inputToken: activeTab === 'buy' ? quoteTokenSymbol : baseTokenSymbol,
      outputToken: activeTab === 'buy' ? baseTokenSymbol : quoteTokenSymbol,
      inputTokenInfo:
        activeTab === 'buy'
          ? currentTokenPair.quoteToken
          : currentTokenPair.baseToken,
      outputTokenInfo:
        activeTab === 'buy'
          ? currentTokenPair.baseToken
          : currentTokenPair.quoteToken
    }
  }, [activeTab, baseTokenSymbol, quoteTokenSymbol, currentTokenPair])

  const {
    handleShowConfirmation,
    handleConfirmSwap,
    isContinueButtonLoading,
    isConfirmButtonLoading,
    swapStatus,
    swapResult,
    swapData
  } = useBuySellSwap({
    transactionData,
    currentScreen,
    setCurrentScreen,
    activeTab,
    selectedPair: safeSelectedPair,
    onClose
  })

  const currentExchangeRate = useMemo(
    () => transactionData?.exchangeRate ?? undefined,
    [transactionData?.exchangeRate]
  )

  useEffect(() => {
    onLoadingStateChange?.(isConfirmButtonLoading)
  }, [isConfirmButtonLoading, onLoadingStateChange])

  useEffect(() => {
    // Handle swap data errors (returned error status) - show toast when swap fails
    if (swapData?.status === SwapStatus.ERROR && swapData?.error) {
      // Create a stable identifier for this error to prevent duplicate handling
      const errorId = `${swapData.error.message || 'unknown'}_${swapData.errorStage || 'unknown'}`

      // Only handle if this is a new error
      if (lastHandledErrorRef.current !== errorId) {
        lastHandledErrorRef.current = errorId
        trackSwapFailure(
          {
            activeTab,
            inputToken: swapTokens.inputToken,
            outputToken: swapTokens.outputToken,
            inputAmount: transactionData?.inputAmount,
            outputAmount: transactionData?.outputAmount,
            exchangeRate: currentExchangeRate
          },
          {
            errorType: 'swap_error',
            errorStage: 'transaction',
            errorMessage: swapData.error.message
              ? swapData.error.message.substring(0, 500)
              : 'Unknown error'
          }
        )

        toast(messages.transactionFailed, 5000)
      }
    } else if (swapData?.status === SwapStatus.SUCCESS) {
      // Clear error ref when swap succeeds to allow handling of future errors
      lastHandledErrorRef.current = null
    }
  }, [
    swapData,
    activeTab,
    swapTokens,
    transactionData,
    currentExchangeRate,
    trackSwapFailure,
    toast
  ])

  const {
    successDisplayData,
    resetSuccessDisplayData,
    confirmationScreenData
  } = useSwapDisplayData({
    swapStatus,
    currentScreen,
    transactionData,
    swapResult,
    activeTab,
    selectedPair: safeSelectedPair
  })

  // Track swap success when success screen is shown
  useEffect(() => {
    if (currentScreen === 'success' && successDisplayData && swapResult) {
      trackSwapSuccess({
        activeTab,
        inputToken: swapTokens.inputToken,
        outputToken: swapTokens.outputToken,
        inputAmount: swapResult.inputAmount,
        outputAmount: swapResult.outputAmount,
        exchangeRate: successDisplayData.exchangeRate ?? undefined,
        signature: swapResult.signature || ''
      })
    }
  }, [
    currentScreen,
    successDisplayData,
    swapResult,
    activeTab,
    swapTokens,
    trackSwapSuccess
  ])

  const handleContinueClick = () => {
    setHasAttemptedSubmit(true)
    if (
      transactionData?.isValid &&
      !isContinueButtonLoading &&
      !transactionData?.isExchangeRateLoading
    ) {
      // Track swap requested
      trackSwapRequested({
        activeTab,
        inputToken: swapTokens.inputToken,
        outputToken: swapTokens.outputToken,
        inputAmount: transactionData.inputAmount,
        outputAmount: transactionData.outputAmount,
        exchangeRate: currentExchangeRate
      })

      handleShowConfirmation()
    }
  }

  useEffect(() => {
    setHasAttemptedSubmit(false)
  }, [activeTab])

  const resetFunction = useCallback(() => {
    resetTransactionData()
    resetSuccessDisplayData()
    setCurrentScreen('input')
    // Clear all tab input values on completion
    setTabInputValues({ buy: '', sell: '', convert: '' })
  }, [
    resetTransactionData,
    resetSuccessDisplayData,
    setCurrentScreen,
    setTabInputValues
  ])

  useEffect(() => {
    setResetState(() => resetFunction)
  }, [setResetState, resetFunction])

  const { data: outputCoin } = useArtistCoin(
    swapTokens.outputTokenInfo?.address
  )
  const pricePerBaseToken = useMemo(() => {
    return outputCoin?.price
      ? outputCoin?.price
      : (outputCoin?.dynamicBondingCurve.priceUSD ?? 0)
  }, [outputCoin])

  const isTransactionInvalid = !transactionData?.isValid

  const displayErrorMessage = useMemo(() => {
    if (activeTab === 'sell' && !hasSufficientBalance) {
      return messages.insufficientAUDIOForSale
    }
    // Show validation errors immediately for sell and convert tabs (like insufficient balance)
    if (
      (activeTab === 'sell' || activeTab === 'convert') &&
      transactionData?.error
    ) {
      return transactionData.error
    }
    // For buy tab, only show validation errors after attempted submit
    if (activeTab === 'buy' && hasAttemptedSubmit && transactionData?.error) {
      return transactionData.error
    }
    // Fallback for empty input, though zod should handle it via transactionData.error
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
    transactionData
  ])

  const shouldShowError =
    !!displayErrorMessage || (activeTab === 'buy' && !hasSufficientBalance)

  if (isConfirmButtonLoading && currentScreen !== 'success') {
    return <ModalLoading />
  }

  if (tokensLoading) {
    return <SwapFormSkeleton />
  }

  return (
    <>
      <Flex
        direction='column'
        style={{ display: currentScreen === 'input' ? 'flex' : 'none' }}
      >
        <Flex direction='column' gap='l'>
          <Flex alignItems='center' justifyContent='space-between'>
            <SegmentedControl
              options={buySellTabsArray}
              selected={activeTab}
              onSelectOption={handleActiveTabChange}
              css={{ flex: 1 }}
            />
          </Flex>

          {activeTab === 'buy' && currentTokenPair ? (
            <BuyTab
              tokenPair={currentTokenPair}
              onTransactionDataChange={handleTransactionDataChange}
              error={shouldShowError}
              errorMessage={displayErrorMessage}
              initialInputValue={tabInputValues.buy}
              onInputValueChange={handleTabInputValueChange}
              availableOutputTokens={availableTokens.filter(
                (t) => t.symbol !== quoteTokenSymbol && t.symbol !== 'USDC'
              )}
              onOutputTokenChange={handleOutputTokenChange}
            />
          ) : activeTab === 'sell' && currentTokenPair ? (
            <SellTab
              tokenPair={currentTokenPair}
              onTransactionDataChange={handleTransactionDataChange}
              error={shouldShowError}
              errorMessage={displayErrorMessage}
              initialInputValue={tabInputValues.sell}
              onInputValueChange={handleTabInputValueChange}
              availableInputTokens={availableInputTokensForSell}
              onInputTokenChange={handleInputTokenChange}
            />
          ) : currentTokenPair ? (
            <ConvertTab
              tokenPair={currentTokenPair}
              onTransactionDataChange={handleTransactionDataChange}
              error={shouldShowError}
              errorMessage={displayErrorMessage}
              initialInputValue={tabInputValues.convert}
              onInputValueChange={handleTabInputValueChange}
              availableInputTokens={availableInputTokensForConvert}
              availableOutputTokens={availableOutputTokensForConvert}
              onInputTokenChange={handleInputTokenChange}
              onOutputTokenChange={handleOutputTokenChange}
              onChangeSwapDirection={handleChangeSwapDirection}
            />
          ) : null}

          {activeTab === 'buy' && !hasSufficientBalance ? (
            <Hint>
              {messages.insufficientUSDC}
              <br />
              <TextLink
                variant='visible'
                href='#'
                onClick={() => {
                  trackAddFundsClicked('insufficient_balance_hint')
                  onClose()
                  openAddCashModal()
                }}
              >
                {messages.addCash}
              </TextLink>
            </Hint>
          ) : null}

          <Button
            variant='primary'
            fullWidth
            isLoading={
              isContinueButtonLoading || transactionData?.isExchangeRateLoading
            }
            disabled={transactionData?.isExchangeRateLoading}
            onClick={handleContinueClick}
          >
            {messages.continue}
          </Button>
        </Flex>
      </Flex>

      <Flex
        direction='column'
        style={{ display: currentScreen === 'confirm' ? 'flex' : 'none' }}
      >
        {currentScreen === 'confirm' && confirmationScreenData ? (
          <ConfirmSwapScreen
            {...confirmationScreenData}
            onBack={() => setCurrentScreen('input')}
            onConfirm={handleConfirmSwap}
            isConfirming={isConfirmButtonLoading}
            activeTab={activeTab}
            selectedPair={safeSelectedPair}
            pricePerBaseToken={pricePerBaseToken}
          />
        ) : null}
      </Flex>

      <Flex
        direction='column'
        style={{ display: currentScreen === 'success' ? 'flex' : 'none' }}
      >
        {currentScreen === 'success' && successDisplayData ? (
          <TransactionSuccessScreen {...successDisplayData} onDone={onClose} />
        ) : null}
      </Flex>
    </>
  )
}
