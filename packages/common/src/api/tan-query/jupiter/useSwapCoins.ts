import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { coinFromSdk } from '~/adapters/coin'
import {
  getUserCoinQueryKey,
  getUserQueryKey,
  getFanClubQueryKey,
  updateAudioBalanceOptimistically,
  useCurrentAccountUser,
  useQueryContext,
  getFanClubFeedQueryKey
} from '~/api'
import { QUERY_KEYS } from '~/api/tan-query/queryKeys'
import type { QueryContextType } from '~/api/tan-query/utils/QueryContext'
import { FollowSource } from '~/models/Analytics'
import type { User } from '~/models/User'
import type { JupiterQuoteResult } from '~/services/Jupiter'
import { NON_FAN_CLUB_MINTS } from '~/store/ui/shared/tokenConstants'

import { getFanClubQueryFn } from '../coins/useFanClub'
import { useTradeableCoins } from '../coins/useTradeableCoins'
import { useFollowUser } from '../users/useFollowUser'
import { entityCacheOptions } from '../utils/entityCacheOptions'

import {
  SwapDependencies,
  SwapErrorType,
  SwapStatus,
  SwapTokensParams,
  SwapTokensResult
} from './types'
import { getSwapErrorResponse } from './utils'

const initializeSwapDependencies = async (
  solanaWalletService: QueryContextType['solanaWalletService'],
  audiusSdk: QueryContextType['audiusSdk'],
  queryClient: ReturnType<typeof useQueryClient>,
  user: User | undefined,
  audioMint: string
): Promise<SwapDependencies | { error: SwapTokensResult }> => {
  try {
    const [sdk, keypair] = await Promise.all([
      audiusSdk(),
      solanaWalletService.getKeypair()
    ])

    if (!keypair) {
      return {
        error: {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.WALLET_ERROR,
            message: 'Wallet not initialised'
          }
        }
      }
    }

    const userPublicKey = keypair.publicKey
    const feePayer = await sdk.services.solanaClient.getFeePayer()
    const ethAddress = user?.wallet

    if (!ethAddress) {
      return {
        error: {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.WALLET_ERROR,
            message: 'User wallet address not found'
          }
        }
      }
    }

    return {
      sdk,
      keypair,
      userPublicKey,
      feePayer,
      ethAddress,
      queryClient,
      user,
      audioMint
    }
  } catch (error) {
    return {
      error: {
        status: SwapStatus.ERROR,
        error: {
          type: SwapErrorType.WALLET_ERROR,
          message: 'Failed to initialize wallet dependencies'
        }
      }
    }
  }
}

export const optimisticallyUpdateSwapBalances = (
  params: SwapTokensParams,
  result: SwapTokensResult,
  queryClient: ReturnType<typeof useQueryClient>,
  user: User | undefined,
  env: QueryContextType['env']
) => {
  const { inputMint, outputMint } = params
  const { inputAmount, outputAmount } = result

  const isInputAudio = inputMint === env.WAUDIO_MINT_ADDRESS
  const isOutputAudio = outputMint === env.WAUDIO_MINT_ADDRESS

  if (inputMint && !isInputAudio) {
    queryClient.setQueryData(
      getUserCoinQueryKey(inputMint, user?.user_id),
      (prevAccountBalances) => {
        if (!prevAccountBalances) return null

        return {
          ...prevAccountBalances,
          balance: prevAccountBalances?.balance - (inputAmount?.amount ?? 0),
          accounts: prevAccountBalances.accounts.map((account) =>
            account.isInAppWallet
              ? {
                  ...account,
                  balance: account.balance - (inputAmount?.amount ?? 0)
                }
              : account
          )
        }
      }
    )
  }

  if (outputMint && !isOutputAudio) {
    queryClient.setQueryData(
      getUserCoinQueryKey(outputMint, user?.user_id),
      (prevAccountBalances) => {
        if (!prevAccountBalances) return null

        return {
          ...prevAccountBalances,
          balance: prevAccountBalances?.balance + (outputAmount?.amount ?? 0),
          accounts: prevAccountBalances.accounts.map((account) =>
            account.isInAppWallet
              ? {
                  ...account,
                  balance: account.balance + (outputAmount?.amount ?? 0)
                }
              : account
          )
        }
      }
    )
  }

  if ((isInputAudio || isOutputAudio) && user?.spl_wallet) {
    const inputAudioLamports = isInputAudio ? (inputAmount?.amount ?? 0) : 0
    const outputAudioLamports = isOutputAudio ? (outputAmount?.amount ?? 0) : 0

    const netChangeLamports =
      BigInt(outputAudioLamports) - BigInt(inputAudioLamports)

    updateAudioBalanceOptimistically({
      queryClient,
      splWallet: user.spl_wallet,
      changeLamports: netChangeLamports
    })
  }

  if (inputMint && !isInputAudio) {
    queryClient.invalidateQueries({
      queryKey: getFanClubQueryKey(inputMint)
    })
  }
  if (outputMint && !isOutputAudio) {
    queryClient.invalidateQueries({
      queryKey: getFanClubQueryKey(outputMint)
    })
  }

  if (inputMint && !isInputAudio) {
    queryClient.invalidateQueries({
      queryKey: getFanClubFeedQueryKey({ mint: inputMint })
    })
  }
  if (outputMint && !isOutputAudio) {
    queryClient.invalidateQueries({
      queryKey: getFanClubFeedQueryKey({ mint: outputMint })
    })
  }
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.comment]
  })

  queryClient.invalidateQueries({
    queryKey: getUserQueryKey(user?.user_id)
  })
}

const autoFollowArtistOnCoinPurchase = async ({
  outputMint,
  queryClient,
  audiusSdk,
  dispatch,
  followUser
}: {
  outputMint: string
  queryClient: ReturnType<typeof useQueryClient>
  audiusSdk: QueryContextType['audiusSdk']
  dispatch: ReturnType<typeof useDispatch>
  followUser: ReturnType<typeof useFollowUser>['mutate']
}) => {
  if (!outputMint || NON_FAN_CLUB_MINTS.includes(outputMint)) {
    return
  }

  try {
    const coin = await queryClient.fetchQuery({
      queryKey: getFanClubQueryKey(outputMint),
      queryFn: async () => {
        const sdk = await audiusSdk()
        const rawCoin = await getFanClubQueryFn(
          outputMint,
          queryClient,
          sdk,
          dispatch
        )
        return coinFromSdk(rawCoin)
      },
      ...entityCacheOptions
    })

    if (!coin?.ownerId) {
      return
    }

    const artistUser = queryClient.getQueryData(getUserQueryKey(coin.ownerId))
    if (artistUser?.does_current_user_follow) {
      return
    }

    followUser({
      followeeUserId: coin.ownerId,
      source: FollowSource.OVERFLOW
    })
  } catch (error) {
    console.error('AutoFollowArtistOnCoinPurchaseError', error as Error)
  }
}

export const useSwapCoins = () => {
  const queryClient = useQueryClient()
  const { solanaWalletService, audiusSdk, env } = useQueryContext()
  const { data: user } = useCurrentAccountUser()
  const { coins } = useTradeableCoins()
  const dispatch = useDispatch()
  const { mutate: followUser } = useFollowUser()

  return useMutation<SwapTokensResult, Error, SwapTokensParams>({
    mutationFn: async (params): Promise<SwapTokensResult> => {
      let errorStage = 'UNKNOWN'
      let firstQuoteResult: JupiterQuoteResult | undefined
      let secondQuoteResult: JupiterQuoteResult | undefined
      let signature: string | undefined

      try {
        errorStage = 'WALLET_INITIALIZATION'
        const dependenciesResult = await initializeSwapDependencies(
          solanaWalletService,
          audiusSdk,
          queryClient,
          user,
          env.WAUDIO_MINT_ADDRESS
        )

        if ('error' in dependenciesResult) {
          return dependenciesResult.error
        }

        const dependencies = dependenciesResult

        errorStage = 'SWAP_EXECUTION'
        const { SwapOrchestrator } = await import('./orchestrator')
        const orchestrator = new SwapOrchestrator()
        const result = await orchestrator.executeSwap(
          params,
          dependencies,
          coins
        )

        if (result.status === SwapStatus.ERROR) {
          if (result.errorStage) {
            errorStage = result.errorStage
          }

          console.error(
            `JupiterSwap${result.errorStage || errorStage}Error`,
            new Error(result.error?.message || 'Unknown swap error'),
            {
              params,
              signature,
              errorStage: result.errorStage || errorStage,
              firstQuoteResponse: firstQuoteResult?.quote,
              secondQuoteResponse: secondQuoteResult?.quote
            }
          )

          throw new Error(result.error?.message || 'Swap failed')
        }

        return result
      } catch (error: unknown) {
        console.error(`JupiterSwap${errorStage}Error`, error, {
          params,
          signature,
          errorStage,
          firstQuoteResponse: firstQuoteResult?.quote,
          secondQuoteResponse: secondQuoteResult?.quote
        })

        return getSwapErrorResponse({
          errorStage,
          error: error as Error,
          inputAmount: firstQuoteResult?.inputAmount,
          outputAmount:
            secondQuoteResult?.outputAmount || firstQuoteResult?.outputAmount
        })
      }
    },
    onSuccess: (result, params) => {
      optimisticallyUpdateSwapBalances(params, result, queryClient, user, env)
      autoFollowArtistOnCoinPurchase({
        outputMint: params.outputMint,
        queryClient,
        audiusSdk,
        dispatch,
        followUser
      })
    },
    onMutate: () => {
      return { status: SwapStatus.SENDING_TRANSACTION }
    }
  })
}
