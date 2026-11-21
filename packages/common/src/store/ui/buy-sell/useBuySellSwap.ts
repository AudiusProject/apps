import { useCallback, useEffect, useState } from 'react'

import { MutationStatus, useQueryClient } from '@tanstack/react-query'

import {
  SLIPPAGE_BPS,
  useFanClub,
  useCurrentAccountUser,
  getFanClubQueryKey,
  getFanClubFeedQueryKey
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
}

type UseBuySellSwapProps = {
  transactionData: TransactionData
  currentScreen: Screen
  setCurrentScreen: (screen: Screen) => void
  activeTab: BuySellTab
  selectedPair: CoinPair
  swapHookData: SwapHookData
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

  const { data: baseCoin } = useFanClub(selectedPair.baseToken.address ?? '')
  const { data: quoteCoin } = useFanClub(selectedPair.quoteToken.address ?? '')

  const { status: swapStatus, error: swapError, data: swapData } = swapHookData

  const performSwap = () => {
    if (!transactionData || !transactionData.isValid) return

    const { inputAmount } = transactionData

    let inputMintAddress: string
    let outputMintAddress: string

    if (activeTab === 'buy') {
      inputMintAddress = selectedPair.quoteToken.address ?? ''
      outputMintAddress = selectedPair.baseToken.address ?? ''
    } else {
      inputMintAddress = selectedPair.baseToken.address ?? ''
      outputMintAddress = selectedPair.quoteToken.address ?? ''
    }

    handleSwap({
      inputMint: inputMintAddress,
      outputMint: outputMintAddress,
      amountUi: inputAmount,
      slippageBps: SLIPPAGE_BPS
    })
  }

  const invalidateBalances = () => {
    if (user?.wallet) {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.usdcBalance, user.wallet]
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoin]
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoins]
      })
      if (baseCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.fanClubMembers, baseCoin?.mint]
        })
      }
      if (quoteCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.fanClubMembers, quoteCoin?.mint]
        })
      }

      if (baseCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: getFanClubQueryKey(baseCoin.mint)
        })
      }
      if (quoteCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: getFanClubQueryKey(quoteCoin.mint)
        })
      }

      if (baseCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: getFanClubFeedQueryKey({ mint: baseCoin.mint })
        })
      }
      if (quoteCoin?.mint) {
        queryClient.invalidateQueries({
          queryKey: getFanClubFeedQueryKey({ mint: quoteCoin.mint })
        })
      }
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.comment]
      })

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
        setCurrentScreen('input')
      }
    } else if (swapStatus === 'error') {
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
