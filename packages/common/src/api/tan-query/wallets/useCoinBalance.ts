import { useMemo } from 'react'

import { AUDIO, FixedDecimal } from '@audius/fixed-decimal'

import {
  useAudioBalance,
  useCurrentAccountUser,
  useUser,
  useUserCoin,
  useUserCoins,
  type UseAudioBalanceOptions,
  type UseUserCoinOptions
} from '~/api'
import { USER_COINS_WALLET_LIST_PARAMS } from '../coins/useUserCoins'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { useUSDCBalance, type UseUSDCBalanceOptions } from './useUSDCBalance'

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
  userCoinsListBalanceOverride = false,
  ...queryOptions
}: {
  mint: string
  userId?: ID
  isPolling?: boolean
  includeExternalWallets?: boolean
  includeStaked?: boolean
  pollingInterval?: number
  walletAddress?: string
  /**
   * When true, resolves balance from the paginated `getUserCoins` list (one request)
   * instead of `getUserCoin` per mint. Only applies when `includeExternalWallets` is true
   * (list payload is aggregate-only). Falls back to `getUserCoin` if the mint is missing
   * from the loaded page (e.g. beyond API max limit).
   */
  userCoinsListBalanceOverride?: boolean
} & UseAudioBalanceOptions &
  UseUserCoinOptions<any> &
  UseUSDCBalanceOptions<any>) => {
  const { env } = useQueryContext()
  const { data: userById } = useUser(userId)
  const { data: currentUser } = useCurrentAccountUser({ enabled: !userId })
  const user = userId ? userById : currentUser
  const ethAddress = user?.wallet ?? null
  const effectiveUserId = user?.user_id ?? null
  const isUsdc = mint === env.USDC_MINT_ADDRESS
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS

  const useListBalance =
    userCoinsListBalanceOverride &&
    includeExternalWallets &&
    !isUsdc &&
    !isAudio

  const userCoinsListQuery = useUserCoins(
    { userId: effectiveUserId, ...USER_COINS_WALLET_LIST_PARAMS },
    {
      enabled:
        !!useListBalance &&
        !!effectiveUserId &&
        queryOptions.enabled !== false,
      refetchInterval: isPolling ? pollingInterval : undefined,
      refetchOnWindowFocus: !isPolling,
      ...queryOptions
    }
  )

  const listCoinEntry = useMemo(
    () => userCoinsListQuery.data?.find((c) => c.mint === mint),
    [userCoinsListQuery.data, mint]
  )

  const listBalanceSelection = useMemo(() => {
    if (!useListBalance || !listCoinEntry) return null
    const { balance: combinedBalance, decimals } = listCoinEntry
    const balanceFD = new FixedDecimal(
      BigInt(combinedBalance.toString()),
      decimals
    )
    return {
      balance: balanceFD,
      balanceLocaleString: balanceFD.toLocaleString(),
      decimals
    }
  }, [useListBalance, listCoinEntry])

  const userCoinsListSettled =
    userCoinsListQuery.isFetched || userCoinsListQuery.isError

  const shouldFetchPerMintUserCoin =
    !isUsdc &&
    queryOptions.enabled !== false &&
    (!useListBalance ||
      !effectiveUserId ||
      (userCoinsListSettled && !listCoinEntry))

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

  // Fan clubs query
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
      enabled: shouldFetchPerMintUserCoin
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

  if (useListBalance) {
    if (listBalanceSelection) {
      return {
        data: listBalanceSelection,
        isLoading: userCoinsListQuery.isLoading,
        isPending: userCoinsListQuery.isPending,
        isError: userCoinsListQuery.isError
      }
    }
    if (!shouldFetchPerMintUserCoin) {
      return {
        data: undefined,
        isLoading: userCoinsListQuery.isLoading,
        isPending: userCoinsListQuery.isPending,
        isError: userCoinsListQuery.isError
      }
    }
  }

  return userCoinQuery
}
