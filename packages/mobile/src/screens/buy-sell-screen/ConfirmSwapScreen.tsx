import { useCallback, useEffect, useMemo } from 'react'

import { SLIPPAGE_BPS, SwapStatus, useSwapCoins } from '@audius/common/api'
import { useBuySellAnalytics } from '@audius/common/hooks'
import { buySellMessages as baseMessages } from '@audius/common/messages'
import type { CoinInfo, CoinPair } from '@audius/common/store'
import {
  getSwapTokens,
  useBuySellScreen,
  useBuySellSwap,
  useSwapDisplayData,
  useCoinAmountFormatting
} from '@audius/common/store'
import { formatCurrencyWithSubscript } from '@audius/common/utils'

import {
  Button,
  Divider,
  Flex,
  LoadingSpinner,
  spacing,
  Text
} from '@audius/harmony-native'
import {
  FixedFooter,
  FixedFooterContent,
  Screen,
  ScreenContent
} from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'

import { SwapBalanceSection } from '../../components/buy-sell'

import { PoweredByJupiter } from './components/PoweredByJupiter'

const messages = {
  ...baseMessages,
  priceEach: (price: number) => {
    const formatted = formatCurrencyWithSubscript(price)
    return `(${formatted} ea.)`
  },
  loadingTitle: 'Transaction in Progress',
  loadingSubtitle: 'This may take a moment.'
}

type ConfirmSwapScreenProps = {
  route: {
    params: {
      confirmationData: {
        payTokenInfo: CoinInfo
        receiveTokenInfo: CoinInfo
        payAmount: number
        receiveAmount: number
        pricePerBaseToken: number
        baseTokenSymbol: string
        exchangeRate?: number | null
      }
      activeTab: 'buy' | 'sell' | 'convert'
      selectedPair: CoinPair
    }
  }
}

const LoadingScreen = () => (
  <Flex
    direction='column'
    justifyContent='center'
    alignItems='center'
    gap='l'
    p='xl'
    flex={1}
  >
    <LoadingSpinner style={{ width: spacing['2xl'], height: spacing['2xl'] }} />
    <Flex direction='column' alignItems='center' gap='s'>
      <Text variant='heading' size='l' color='default' textAlign='center'>
        {messages.loadingTitle}
      </Text>
      <Text
        variant='title'
        size='l'
        strength='weak'
        color='default'
        textAlign='center'
      >
        {messages.loadingSubtitle}
      </Text>
    </Flex>
  </Flex>
)

export const ConfirmSwapScreen = ({ route }: ConfirmSwapScreenProps) => {
  const navigation = useNavigation()
  const { toast } = useToast()
  const { trackSwapConfirmed, trackSwapSuccess, trackSwapFailure } =
    useBuySellAnalytics()

  const {
    confirmationData: {
      payTokenInfo,
      receiveTokenInfo,
      payAmount,
      receiveAmount,
      exchangeRate = null
    },
    activeTab,
    selectedPair
  } = route.params

  const stableOnScreenChange = useCallback(() => {
    // No-op since we handle navigation separately
  }, [])

  const { currentScreen, setCurrentScreen } = useBuySellScreen({
    onScreenChange: stableOnScreenChange
  })

  // Set the screen to 'confirm' when this component mounts
  useEffect(() => {
    setCurrentScreen('confirm')
  }, [setCurrentScreen])

  // Create transaction data from the confirmation data passed via navigation
  const transactionData = useMemo(
    () => ({
      inputAmount: payAmount,
      outputAmount: receiveAmount,
      isValid: true // If we got to the confirmation screen, the data should be valid
    }),
    [payAmount, receiveAmount]
  )

  const { mutate: performSwap, ...swapHookState } = useSwapCoins()
  const {
    handleConfirmSwap,
    isConfirmButtonLoading,
    swapStatus,
    swapError,
    swapResult,
    swapData
  } = useBuySellSwap({
    transactionData,
    currentScreen,
    setCurrentScreen,
    activeTab,
    selectedPair,
    swapHookData: swapHookState,
    handleSwap: performSwap
  })

  const swapTokens = useMemo(
    () => getSwapTokens(activeTab, selectedPair),
    [activeTab, selectedPair]
  )

  const { successDisplayData } = useSwapDisplayData({
    swapStatus,
    currentScreen,
    transactionData,
    swapResult,
    activeTab,
    selectedPair
  })

  useEffect(() => {
    if (currentScreen === 'success' && successDisplayData) {
      trackSwapSuccess({
        activeTab,
        inputToken: swapTokens.inputToken,
        outputToken: swapTokens.outputToken,
        inputAmount: swapResult?.inputAmount ?? payAmount,
        outputAmount: swapResult?.outputAmount ?? receiveAmount,
        exchangeRate,
        signature: swapResult?.signature ?? ''
      })

      navigation.navigate('TransactionResultScreen', {
        result: {
          status: 'success' as const,
          data: successDisplayData
        }
      })
    }
  }, [
    currentScreen,
    successDisplayData,
    navigation,
    activeTab,
    swapResult,
    payAmount,
    receiveAmount,
    swapTokens,
    exchangeRate,
    trackSwapSuccess
  ])

  // Handle swap data errors (when swap returns error status) - navigate back and show toast
  useEffect(() => {
    if (
      (swapData?.status === SwapStatus.ERROR && swapData?.error) ||
      swapStatus === 'error' ||
      swapError
    ) {
      trackSwapFailure(
        {
          activeTab,
          inputToken: swapTokens.inputToken,
          outputToken: swapTokens.outputToken,
          inputAmount: payAmount,
          outputAmount: receiveAmount,
          exchangeRate
        },
        {
          errorType: 'swap_error',
          errorStage: 'transaction',
          errorMessage: swapData?.error?.message
            ? swapData?.error?.message.substring(0, 500)
            : 'Unknown error'
        }
      )

      // Navigate back to input screen (matching web behavior)
      navigation.navigate('BuySellMain')

      // Show toast notification
      toast({ content: messages.transactionFailed, type: 'error' })
    }
  }, [
    swapData,
    activeTab,
    swapTokens,
    payAmount,
    receiveAmount,
    exchangeRate,
    trackSwapFailure,
    navigation,
    toast,
    swapStatus,
    swapError
  ])

  // balance isn't needed so we pass 0
  const { formattedAmount: formattedPayAmount } = useCoinAmountFormatting({
    amount: payAmount,
    availableBalance: 0,
    isStablecoin: !!payTokenInfo.isStablecoin,
    decimals: payTokenInfo.decimals
  })

  const { formattedAmount: formattedReceiveAmount } = useCoinAmountFormatting({
    amount: receiveAmount,
    availableBalance: 0,
    isStablecoin: !!receiveTokenInfo.isStablecoin,
    decimals: receiveTokenInfo.decimals
  })

  const handleBack = () => {
    navigation.goBack()
  }

  const handleConfirm = () => {
    trackSwapConfirmed({
      activeTab,
      inputToken: swapTokens.inputToken,
      outputToken: swapTokens.outputToken,
      inputAmount: payAmount,
      outputAmount: receiveAmount,
      exchangeRate,
      slippageBps: SLIPPAGE_BPS
    })

    handleConfirmSwap()
  }

  if (!formattedPayAmount || !formattedReceiveAmount) {
    return null
  }

  // Show loading screen when confirming transaction
  if (isConfirmButtonLoading) {
    return (
      <Screen variant='white' url='/buy-sell/confirm-loading'>
        <ScreenContent>
          <LoadingScreen />
        </ScreenContent>
      </Screen>
    )
  }

  return (
    <Screen
      title={messages.confirmDetails}
      variant='white'
      url='/buy-sell/confirm'
    >
      <ScreenContent>
        <FixedFooterContent>
          <PoweredByJupiter />
          <Flex direction='column' gap='xl' p='l' mt='xl'>
            <Text variant='body' size='l' textAlign='left'>
              {messages.confirmReview}
            </Text>
            <Flex direction='column' gap='xl'>
              <SwapBalanceSection
                title={messages.youPay}
                tokenInfo={payTokenInfo}
                amount={formattedPayAmount}
              />
              <Divider flex={1} />
              <SwapBalanceSection
                title={messages.youReceive}
                tokenInfo={receiveTokenInfo}
                amount={formattedReceiveAmount}
              />
            </Flex>
            {exchangeRate ? (
              <Flex row gap='xs' alignItems='center' pt='s'>
                <Text variant='body' size='s' color='subdued'>
                  {messages.exchangeRateLabel}
                </Text>
                <Text variant='body' size='s' color='default'>
                  {messages.exchangeRateValue(
                    payTokenInfo.symbol,
                    receiveTokenInfo.symbol,
                    exchangeRate
                  )}
                </Text>
              </Flex>
            ) : null}
          </Flex>
        </FixedFooterContent>

        <FixedFooter>
          <Button variant='secondary' fullWidth onPress={handleBack}>
            {messages.back}
          </Button>
          <Button variant='primary' fullWidth onPress={handleConfirm}>
            {messages.confirm}
          </Button>
        </FixedFooter>
      </ScreenContent>
    </Screen>
  )
}
