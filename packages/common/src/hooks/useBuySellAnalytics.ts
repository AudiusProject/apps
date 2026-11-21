import { useCallback } from 'react'

import { Name } from '~/models/Analytics'

import { useAnalytics } from './useAnalytics'

export type SwapDetails = {
  activeTab: 'buy' | 'sell' | 'convert'
  inputToken: string
  outputToken: string
  inputAmount?: number
  outputAmount?: number
  exchangeRate?: number | null
  externalWalletAddress?: string
}

export type SwapError = {
  errorType: string
  errorStage: string
  errorMessage?: string
}

export const useBuySellAnalytics = () => {
  const { trackEvent } = useAnalytics()

  const trackSwapRequested = useCallback(
    (swapDetails: SwapDetails) => {
      return trackEvent({
        eventName: Name.BUY_SELL_SWAP_REQUESTED,
        activeTab: swapDetails.activeTab,
        inputToken: swapDetails.inputToken,
        outputToken: swapDetails.outputToken,
        inputAmount: swapDetails.inputAmount,
        outputAmount: swapDetails.outputAmount,
        exchangeRate: swapDetails.exchangeRate,
        externalWalletAddress: swapDetails.externalWalletAddress
      })
    },
    [trackEvent]
  )

  const trackSwapConfirmed = useCallback(
    (swapDetails: SwapDetails & { slippageBps: number }) => {
      return trackEvent({
        eventName: Name.BUY_SELL_SWAP_CONFIRMED,
        activeTab: swapDetails.activeTab,
        inputToken: swapDetails.inputToken,
        outputToken: swapDetails.outputToken,
        inputAmount: swapDetails.inputAmount,
        outputAmount: swapDetails.outputAmount,
        exchangeRate: swapDetails.exchangeRate,
        slippageBps: swapDetails.slippageBps,
        externalWalletAddress: swapDetails.externalWalletAddress
      })
    },
    [trackEvent]
  )

  const trackSwapSuccess = useCallback(
    (swapDetails: SwapDetails & { signature: string }) => {
      return trackEvent({
        eventName: Name.BUY_SELL_SWAP_SUCCESS,
        activeTab: swapDetails.activeTab,
        inputToken: swapDetails.inputToken,
        outputToken: swapDetails.outputToken,
        inputAmount: swapDetails.inputAmount,
        outputAmount: swapDetails.outputAmount,
        exchangeRate: swapDetails.exchangeRate,
        signature: swapDetails.signature,
        externalWalletAddress: swapDetails.externalWalletAddress
      })
    },
    [trackEvent]
  )

  const trackSwapFailure = useCallback(
    (swapDetails: SwapDetails, errorDetails: SwapError) => {
      return trackEvent({
        eventName: Name.BUY_SELL_SWAP_FAILURE,
        activeTab: swapDetails.activeTab,
        inputToken: swapDetails.inputToken,
        outputToken: swapDetails.outputToken,
        inputAmount: swapDetails.inputAmount,
        outputAmount: swapDetails.outputAmount,
        exchangeRate: swapDetails.exchangeRate,
        errorType: errorDetails.errorType,
        errorStage: errorDetails.errorStage,
        errorMessage: errorDetails.errorMessage,
        externalWalletAddress: swapDetails.externalWalletAddress
      })
    },
    [trackEvent]
  )

  const trackAddFundsClicked = useCallback(
    (source: 'insufficient_balance_hint' | 'input_screen') => {
      return trackEvent({
        eventName: Name.BUY_SELL_ADD_FUNDS_CLICKED,
        source
      })
    },
    [trackEvent]
  )

  return {
    trackSwapRequested,
    trackSwapConfirmed,
    trackSwapSuccess,
    trackSwapFailure,
    trackAddFundsClicked
  }
}
