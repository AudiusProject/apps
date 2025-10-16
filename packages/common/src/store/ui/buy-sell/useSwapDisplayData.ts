import { useState, useEffect, useCallback, useMemo } from 'react'

import type {
  BuySellTab,
  Screen,
  SuccessDisplayData,
  ConfirmationScreenData,
  CoinPair,
  SwapResult,
  TransactionData
} from './types'

const calculatePriceInternal = (
  currentTransactionData:
    | TransactionData
    | { inputAmount: number; outputAmount: number; isValid: boolean }
    | null,
  tab: BuySellTab
): number => {
  if (!currentTransactionData) return 0
  const { inputAmount, outputAmount } = currentTransactionData
  if (tab === 'buy') {
    return outputAmount !== 0 ? inputAmount / outputAmount : 0
  } else {
    // tab === 'sell'
    return inputAmount !== 0 ? outputAmount / inputAmount : 0
  }
}

type UseSwapDisplayDataProps = {
  swapStatus?: string | null
  currentScreen: Screen
  transactionData: TransactionData | null
  swapResult: SwapResult | null
  activeTab: BuySellTab
  selectedPair: CoinPair
}

export const useSwapDisplayData = ({
  swapStatus,
  currentScreen,
  transactionData,
  swapResult,
  activeTab,
  selectedPair
}: UseSwapDisplayDataProps) => {
  const [successDisplayData, setSuccessDisplayData] =
    useState<SuccessDisplayData | null>(null)

  const confirmationScreenData = useMemo(() => {
    if (!transactionData) return null

    const payInfo =
      activeTab === 'buy' ? selectedPair.quoteToken : selectedPair.baseToken
    const receiveInfo =
      activeTab === 'buy' ? selectedPair.baseToken : selectedPair.quoteToken

    return {
      payTokenInfo: payInfo,
      receiveTokenInfo: receiveInfo,
      pricePerBaseToken: calculatePriceInternal(transactionData, activeTab),
      baseTokenSymbol: selectedPair.baseToken.symbol,
      payAmount: transactionData.inputAmount,
      receiveAmount: transactionData.outputAmount,
      exchangeRate: transactionData.exchangeRate
    } as ConfirmationScreenData
  }, [activeTab, selectedPair, transactionData])

  useEffect(() => {
    if (
      swapStatus === 'success' &&
      currentScreen === 'success' &&
      !successDisplayData // Only set once until explicitly reset
    ) {
      const payInfo =
        activeTab === 'buy' ? selectedPair.quoteToken : selectedPair.baseToken
      const receiveInfo =
        activeTab === 'buy' ? selectedPair.baseToken : selectedPair.quoteToken

      const payAmount =
        swapResult?.inputAmount ?? transactionData?.inputAmount ?? 0
      const receiveAmount =
        swapResult?.outputAmount ?? transactionData?.outputAmount ?? 0

      const finalTransactionData = {
        inputAmount: payAmount,
        outputAmount: receiveAmount,
        isValid: true // Assuming isValid if we reach success
      }

      setSuccessDisplayData({
        payTokenInfo: payInfo,
        receiveTokenInfo: receiveInfo,
        pricePerBaseToken: calculatePriceInternal(
          finalTransactionData,
          activeTab
        ),
        baseTokenSymbol: selectedPair.baseToken.symbol,
        payAmount,
        receiveAmount,
        exchangeRate: transactionData?.exchangeRate
      })
    }
  }, [
    swapStatus,
    currentScreen,
    transactionData,
    swapResult,
    activeTab,
    selectedPair,
    successDisplayData
  ])

  const resetSuccessDisplayData = useCallback(() => {
    setSuccessDisplayData(null)
  }, [])

  return { successDisplayData, resetSuccessDisplayData, confirmationScreenData }
}
