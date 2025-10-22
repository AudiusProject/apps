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
  useCoinPair,
  useCurrentAccountUser,
  useSwapCoins,
  useTradeableCoins
} from '@audius/common/api'
import { useBuySellAnalytics, useOwnedCoins } from '@audius/common/hooks'
import { buySellMessages as messages } from '@audius/common/messages'
import { COIN_DETAIL_PAGE } from '@audius/common/src/utils/route'
import {
  BuySellTab,
  Screen,
  useBuySellScreen,
  useBuySellSwap,
  useBuySellTabs,
  buySellTabsArray,
  useBuySellTransactionData,
  useCurrentCoinPair,
  useSafeTokenPair,
  useSwapDisplayData,
  useCoinStates
} from '@audius/common/store'
import { Button, Flex, Hint, SegmentedControl, TextLink } from '@audius/harmony'
import { matchPath, useLocation } from 'react-router-dom'

import { appkitModal } from 'app/ReownAppKitModal'
import { ModalLoading } from 'components/modal-loading'
import { ToastContext } from 'components/toast/ToastContext'
import { useExternalWalletSwap } from 'hooks/useExternalWalletSwap'
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

  const { currentScreen, setCurrentScreen } = useBuySellScreen({
    onScreenChange
  })

  const {
    transactionData,
    hasSufficientBalance,
    handleTransactionDataChange,
    resetTransactionData
  } = useBuySellTransactionData()

  const { data: currentUser } = useCurrentAccountUser()

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
    path: COIN_DETAIL_PAGE,
    exact: true
  })
  const { data: selectedPair } = useCoinPair({
    baseSymbol: initialTicker ?? match?.params.ticker ?? '',
    quoteSymbol: 'USDC'
  })

  // Use custom hooks for token state management
  const {
    getCurrentTabTokens,
    handleInputTokenChange: handleInputTokenChangeInternal,
    handleOutputTokenChange: handleOutputTokenChangeInternal,
    handleSwapDirection
  } = useCoinStates(selectedPair)

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

  // Get external wallet account (if connected via AppKit)
  const externalWalletAccount = appkitModal.getAccount('solana')

  // Get all available tokens, filtered by external wallet if connected
  const { coins, isLoading: coinsLoading } = useTradeableCoins({
    externalWalletAddress: externalWalletAccount?.address
  })

  const availableCoins = useMemo(() => {
    return coinsLoading ? [] : Object.values(coins)
  }, [coins, coinsLoading])

  // Get tokens that user owns (includes USDC if user has balance) for internal wallet
  const { ownedCoins } = useOwnedCoins(availableCoins)

  // Create owned addresses set for filtering (only needed for internal wallets)
  const ownedAddresses = useMemo(() => {
    return new Set(ownedCoins.map((coin) => coin.address))
  }, [ownedCoins])

  // Create current token pair based on selected base and quote tokens
  const currentTokenPair = useCurrentCoinPair({
    baseTokenSymbol,
    quoteTokenSymbol,
    availableCoins,
    selectedPair
  })

  // Get filtered tokens for sell tab (owned coins, excluding current base token and USDC)
  const { coinsArray: availableInputTokensForSell } = useTradeableCoins({
    context: 'pay',
    excludeSymbols: [baseTokenSymbol],
    externalWalletAddress: externalWalletAccount?.address,
    // For internal wallets, only show owned tokens
    onlyOwned: !externalWalletAccount?.address,
    ownedAddresses
  })

  // Get filtered tokens for convert tab input (owned coins, excluding both base and quote)
  const { coinsArray: availableInputTokensForConvert } = useTradeableCoins({
    excludeSymbols: [baseTokenSymbol, quoteTokenSymbol],
    externalWalletAddress: externalWalletAccount?.address,
    // For internal wallets, only show owned tokens
    onlyOwned: !externalWalletAccount?.address,
    ownedAddresses
  })

  // Get filtered tokens for convert tab output (all coins except base token)
  const { coinsArray: availableOutputTokensForConvert } = useTradeableCoins({
    excludeSymbols: [baseTokenSymbol],
    externalWalletAddress: externalWalletAccount?.address
  })

  // Get filtered tokens for buy tab output (all coins except quote token and USDC)
  const availableOutputTokensForBuy = availableCoins.filter(
    (t) => t.symbol !== quoteTokenSymbol && t.symbol !== 'USDC'
  )

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

  const internalSwapHook = useSwapCoins()
  const externalSwapHook = useExternalWalletSwap()
  const { mutateAsync: performSwap, ...swapHookState } =
    externalWalletAccount?.address ? externalSwapHook : internalSwapHook
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
    swapHookData: swapHookState,
    handleSwap: async (params: {
      inputMint: string
      outputMint: string
      amountUi: number
      slippageBps: number
    }) => {
      const swapParams = {
        ...params,
        // External wallet swaps require some extra params. These are unused for internal swaps
        inputDecimals: swapTokens.inputTokenInfo!.decimals,
        outputDecimals: swapTokens.outputTokenInfo!.decimals,
        walletAddress: externalWalletAccount?.address as string
      }
      await performSwap(swapParams)
    }
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

  const userHasWallet = !!externalWalletAccount?.address || !!currentUser

  if (isConfirmButtonLoading && currentScreen !== 'success') {
    return <ModalLoading />
  }

  // Show loading when fetching coins, or when external wallet is connected and still loading wallet coins
  if (coinsLoading) {
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
              availableOutputTokens={availableOutputTokensForBuy}
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
            disabled={transactionData?.isExchangeRateLoading || !userHasWallet}
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
