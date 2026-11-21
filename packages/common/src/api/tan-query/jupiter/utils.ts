import { USDC } from '@audius/fixed-decimal'
import { QueryClient, useQueryClient } from '@tanstack/react-query'

import type { User } from '~/models/User'
import { CoinInfo } from '~/store/ui/buy-sell/types'
import {
  AUDIO_MINT,
  NON_FAN_CLUB_MINTS
} from '~/store/ui/shared/tokenConstants'

import { getFanClubQueryKey } from '../coins'
import { QUERY_KEYS } from '../queryKeys'

import { SwapErrorType, SwapStatus } from './types'

export function getSwapErrorResponse(params: {
  errorStage: string
  error: Error
  inputAmount?: {
    amount: number
    uiAmount: number
  }
  outputAmount?: {
    amount: number
    uiAmount: number
  }
}) {
  const { errorStage, error, inputAmount, outputAmount } = params

  if (errorStage === 'QUOTE_RETRIEVAL') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.QUOTE_FAILED,
        message: error?.message ?? 'Failed to get swap quote'
      }
    }
  } else if (errorStage === 'INPUT_TOKEN_PREPARATION') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.BUILD_FAILED,
        message: `Failed to prepare input token: ${error.message}`
      },
      inputAmount,
      outputAmount
    }
  } else if (errorStage === 'TRANSACTION_BUILD') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.BUILD_FAILED,
        message: error?.message ?? 'Failed to build transaction'
      },
      inputAmount,
      outputAmount
    }
  } else if (errorStage === 'TRANSACTION_RELAY') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.RELAY_FAILED,
        message: error?.message ?? 'Failed to relay transaction'
      },
      inputAmount,
      outputAmount
    }
  } else {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.UNKNOWN,
        message: error?.message ?? 'An unknown error occurred'
      }
    }
  }
}

export function formatTokenPrice(price: string, decimalPlaces: number): string {
  const maxDecimalPlaces = Math.min(decimalPlaces, 6)

  return USDC(price.replace(/,/g, '')).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimalPlaces
  })
}

export const findTokenByAddress = (
  tokens: Record<string, CoinInfo>,
  address: string
): CoinInfo | undefined => {
  return Object.values(tokens).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  )
}

export const invalidateSwapQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  user: User
): Promise<void> => {
  if (user?.wallet) {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.usdcBalance, user.wallet]
    })
  }

  await queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.userCoins]
  })
}

export const getIsDirectSwappable = (
  inputMint: string,
  outputMint: string
): boolean => {
  if (
    NON_FAN_CLUB_MINTS.includes(inputMint) &&
    NON_FAN_CLUB_MINTS.includes(outputMint)
  ) {
    return true
  }
  return inputMint === AUDIO_MINT || outputMint === AUDIO_MINT
}

export const getCoinPoolState = (
  mint: string,
  queryClient: QueryClient
): { isDBC: boolean; isDAMM: boolean; hasPool: boolean } => {
  if (NON_FAN_CLUB_MINTS.includes(mint)) {
    return {
      isDBC: false,
      isDAMM: false,
      hasPool: false
    }
  }
  const coinInfo = queryClient.getQueryData(getFanClubQueryKey(mint))
  const isDBC = coinInfo?.dynamicBondingCurve?.isMigrated === false
  const isDAMM = coinInfo?.dynamicBondingCurve?.isMigrated === true
  return {
    isDBC,
    isDAMM,
    hasPool: isDBC || isDAMM
  }
}
