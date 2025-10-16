import { AUDIO, FixedDecimal } from '@audius/fixed-decimal'

import {
  useAudioBalance,
  useCurrentAccountUser,
  useUser,
  useUserCoin
} from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QueryOptions } from '../types'

import { useUSDCBalance } from './useUSDCBalance'

const USDC_DECIMALS = 6
const WEI_DECIMALS = 18

/**
 * Wrapper hook that gives the balance of any coin - including USDC which uses a different query.
 * Uses the appropriate query hook and formats accordingly
 *
 * @param mint The mint address of the coin to fetch balance for
 * @param options Options for the query and polling
 * @returns Object with status, data, refresh, and cancelPolling
 */
export const useCoinBalance = ({
  mint,
  userId,
  isPolling,
  pollingInterval = 1000,
  includeExternalWallets = true,
  includeStaked = true,
  walletAddress,
  ...queryOptions
}: {
  mint: string
  userId?: ID
  isPolling?: boolean
  includeExternalWallets?: boolean
  includeStaked?: boolean
  pollingInterval?: number
  walletAddress?: string
} & QueryOptions) => {
  const { env } = useQueryContext()
  const { data: userById } = useUser(userId)
  const { data: currentUser } = useCurrentAccountUser({ enabled: !userId })
  const user = userId ? userById : currentUser
  const ethAddress = user?.wallet ?? null
  const isUsdc = mint === env.USDC_MINT_ADDRESS
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS

  // For AUDIO, we need to use the useAudioBalance hook since it includes ETH audio. useUserCoin is only SOL AUDIO
  const audioCoinQuery = useAudioBalance(
    {
      userId,
      includeConnectedWallets: includeExternalWallets,
      includeStaked
    },
    {
      enabled: isAudio,
      refetchInterval: isPolling ? pollingInterval : undefined,
      refetchOnWindowFocus: !isPolling,
      ...queryOptions
    }
  )

  // Artist coins query
  const userCoinQuery = useUserCoin(
    { mint, userId },
    {
      select: (aggregateCoinAccounts) => {
        if (!aggregateCoinAccounts) return null
        // This returns the aggregate
        const { balance: combinedBalance, decimals } = aggregateCoinAccounts
        if (!includeExternalWallets) {
          const account = aggregateCoinAccounts.accounts.find(
            (account) => account.isInAppWallet
          )
          if (!account) return null
          const balanceFD = new FixedDecimal(
            BigInt(account.balance.toString()),
            decimals
          )
          return {
            balance: balanceFD,
            balanceLocaleString: balanceFD.toLocaleString(),
            decimals
          }
        }

        const balanceFD = new FixedDecimal(
          BigInt(combinedBalance.toString()),
          decimals
        )

        return {
          balance: balanceFD,
          balanceLocaleString: balanceFD.toLocaleString(),
          decimals
        }
      },
      refetchInterval: isPolling ? pollingInterval : undefined,
      refetchOnWindowFocus: !isPolling,
      ...queryOptions,
      enabled: !isUsdc && queryOptions.enabled !== false
    }
  )

  // USDC query
  const usdcQuery = useUSDCBalance({
    isPolling,
    pollingInterval,
    select: (usdcBalance) => {
      if (!usdcBalance) return null

      const balanceFD = new FixedDecimal(
        BigInt(usdcBalance.toString()),
        USDC_DECIMALS
      )

      return {
        balance: balanceFD,
        balanceLocaleString: balanceFD.toLocaleString(),
        decimals: USDC_DECIMALS
      }
    },
    ...queryOptions,
    enabled: isUsdc && !!ethAddress && queryOptions.enabled !== false
  })

  if (isUsdc) return usdcQuery

  if (isAudio) {
    return {
      data: {
        balance: AUDIO(audioCoinQuery.totalBalance),
        balanceLocaleString: AUDIO(
          audioCoinQuery.totalBalance
        ).toLocaleString(),
        decimals: WEI_DECIMALS
      },
      isLoading: audioCoinQuery.isLoading,
      isPending: audioCoinQuery.isLoading,
      isError: audioCoinQuery.isError
    }
  }
  return userCoinQuery
}
