import { useCallback, useEffect, useState } from 'react'

import { MutationStatus, useQueryClient } from '@tanstack/react-query'

import {
  SLIPPAGE_BPS,
  useArtistCoin,
  useCurrentAccountUser,
  getArtistCoinQueryKey
} from '~/api'
import { SwapStatus, SwapTokensResult } from '~/api/tan-query/jupiter/types'
import { TQTrack } from '~/api/tan-query/models'
import { QUERY_KEYS } from '~/api/tan-query/queryKeys'
import { isContentTokenGated } from '~/models'

import type {
  BuySellTab,
  Screen,
  SwapResult,
  CoinPair,
  TransactionData
} from './types'

type SwapHookData = {
  data?: SwapTokensResult
  status: MutationStatus
  error?: Error | null
}

type SwapParams = {
  inputMint: string
  outputMint: string
  amountUi: number
  slippageBps: number
  inputDecimals: number
  outputDecimals: number
}

type UseBuySellSwapProps = {
  transactionData: TransactionData
  currentScreen: Screen
  setCurrentScreen: (screen: Screen) => void
  activeTab: BuySellTab
  selectedPair: CoinPair
  swapHookData: SwapHookData
  // The swap is handled externally to allow for external wallet swaps
  // Web and mobile use different services for these so we let each repo handle the logic
  handleSwap: (params: SwapParams) => void
}

export const useBuySellSwap = (props: UseBuySellSwapProps) => {
  const {
    transactionData,
    currentScreen,
    setCurrentScreen,
    activeTab,
    selectedPair,
    swapHookData,
    handleSwap
  } = props
  const queryClient = useQueryClient()
  const { data: user } = useCurrentAccountUser()
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null)

  const { data: baseCoin } = useArtistCoin(selectedPair.baseToken.address ?? '')
  const { data: quoteCoin } = useArtistCoin(
    selectedPair.quoteToken.address ?? ''
  )

  const { status: swapStatus, error: swapError, data: swapData } = swapHookData

  const performSwap = () => {
    if (!transactionData || !transactionData.isValid) return

    const { inputAmount } = transactionData

    // Get the correct input and output token addresses based on the selected pair and active tab
    let inputMintAddress: string
    let outputMintAddress: string

    if (activeTab === 'buy') {
      // Buy: pay with quote token, receive base token
      inputMintAddress = selectedPair.quoteToken.address ?? ''
      outputMintAddress = selectedPair.baseToken.address ?? ''
    } else {
      // Sell: pay with base token, receive quote token
      inputMintAddress = selectedPair.baseToken.address ?? ''
      outputMintAddress = selectedPair.quoteToken.address ?? ''
    }

    if (!baseCoin?.decimals || !quoteCoin?.decimals) return

    handleSwap({
      inputMint: inputMintAddress,
      outputMint: outputMintAddress,
      amountUi: inputAmount,
      slippageBps: SLIPPAGE_BPS,
      inputDecimals: baseCoin.decimals,
      outputDecimals: quoteCoin.decimals
    })
  }

  const invalidateBalances = () => {
    if (user?.wallet) {
      // Invalidate USDC balance queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.usdcBalance, user.wallet]
      })
      // Invalidate individual user coin queries (for artist coins and $AUDIO)
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoin]
      })
      // Invalidate general user coins queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoins]
      })
      // Invalidate artist coin members queries (leaderboard)
      if (baseCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.artistCoinMembers, baseCoin?.mint]
        })
      }
      if (quoteCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.artistCoinMembers, quoteCoin?.mint]
        })
      }

      // Invalidate artist coin queries to refresh fee claiming and graduation progress
      if (baseCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: getArtistCoinQueryKey(baseCoin.mint)
        })
      }
      if (quoteCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: getArtistCoinQueryKey(quoteCoin.mint)
        })
      }

      // Invalidate track queries to provide track access if the user has traded the artist coin
      const baseOwnerId = baseCoin?.ownerId ?? null
      const quoteOwnerId = quoteCoin?.ownerId ?? null

      queryClient.invalidateQueries({
        predicate: (query) => {
          if (query.queryKey[0] !== QUERY_KEYS.track) return false

          const track = query.state.data as TQTrack | undefined
          if (!track) return false

          return (
            (track.owner_id === baseOwnerId ||
              track.owner_id === quoteOwnerId) &&
            isContentTokenGated(track.stream_conditions)
          )
        }
      })
    }
  }

  const handleShowConfirmation = useCallback(() => {
    if (
      !transactionData ||
      !transactionData.isValid ||
      currentScreen !== 'input'
    )
      return
    setCurrentScreen('confirm')
  }, [transactionData, currentScreen, setCurrentScreen])

  const handleConfirmSwap = useCallback(() => {
    if (
      !transactionData ||
      !transactionData.isValid ||
      currentScreen !== 'confirm'
    )
      return

    performSwap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionData, currentScreen, activeTab])

  useEffect(() => {
    if (swapStatus === 'success' && swapData) {
      if (swapData.status === SwapStatus.SUCCESS) {
        // Success - invalidate balances and navigate to success screen
        invalidateBalances()
        setSwapResult({
          inputAmount:
            swapData.inputAmount?.uiAmount ??
            (transactionData?.inputAmount || 0),
          outputAmount:
            swapData.outputAmount?.uiAmount ??
            (transactionData?.outputAmount || 0),
          signature: swapData.signature
        })
        setCurrentScreen('success')
      } else {
        // Error data returned - return to input screen
        setCurrentScreen('input')
      }
    } else if (swapStatus === 'error') {
      // Error - return to input screen
      setCurrentScreen('input')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapStatus, swapData, setCurrentScreen, transactionData])

  const isContinueButtonLoading =
    swapStatus === 'pending' && currentScreen === 'input'
  const isConfirmButtonLoading =
    swapStatus === 'pending' && currentScreen === 'confirm'

  return {
    handleShowConfirmation,
    handleConfirmSwap,
    isContinueButtonLoading,
    isConfirmButtonLoading,
    swapError,
    swapStatus,
    swapResult,
    swapData
  }
}
