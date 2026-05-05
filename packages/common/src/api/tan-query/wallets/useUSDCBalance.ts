import { useCallback, useEffect, useRef, useState } from 'react'

import { UsdcWei } from '@audius/fixed-decimal'
import { TokenAccountNotFoundError } from '@solana/spl-token'
import { Commitment } from '@solana/web3.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'

import { useCurrentAccountUser } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { Status } from '~/models/Status'
import { StringUSDC } from '~/models/Wallet'
import { getUserbankAccountInfo } from '~/services/index'
import { getRecoveryStatus } from '~/store/buy-usdc/selectors'
import { setUSDCBalance } from '~/store/wallet/slice'

import { QUERY_KEYS } from '../queryKeys'
import { type QueryKey, SelectableQueryOptions } from '../types'

export const getUSDCBalanceQueryKey = (
  ethAddress: string | null,
  commitment: Commitment
) =>
  [
    QUERY_KEYS.usdcBalance,
    ethAddress,
    commitment
  ] as unknown as QueryKey<UsdcWei | null>

export type UseUSDCBalanceOptions<TResult> = SelectableQueryOptions<
  UsdcWei | null,
  TResult
>

/**
 * Hook to get the USDC balance for the current user.
 * Uses TanStack Query for data fetching and caching.
 *
 * @param options Options for the query and polling
 * @returns Object with status, data, refresh, and cancelPolling
 */
export const useUSDCBalance = <TResult = UsdcWei | null>({
  isPolling,
  pollingInterval = 2000,
  commitment = 'processed',
  ...queryOptions
}: {
  isPolling?: boolean
  pollingInterval?: number
  commitment?: Commitment
} & UseUSDCBalanceOptions<TResult> = {}) => {
  const { audiusSdk } = useQueryContext()
  const { data: user } = useCurrentAccountUser()
  const ethAddress = user?.wallet ?? null
  const dispatch = useDispatch()
  const recoveryStatus = useSelector(getRecoveryStatus)
  const queryClient = useQueryClient()

  const result = useQuery({
    queryKey: getUSDCBalanceQueryKey(ethAddress, commitment),
    queryFn: async () => {
      const sdk = await audiusSdk()
      if (!ethAddress) {
        return null
      }

      try {
        const account = await getUserbankAccountInfo(
          sdk,
          {
            ethAddress,
            mint: 'USDC'
          },
          commitment
        )
        const balance =
          account?.amount !== undefined && account?.amount !== null
            ? (BigInt(account.amount.toString()) as UsdcWei)
            : null

        // Still update Redux for compatibility with existing code
        dispatch(setUSDCBalance({ amount: balance?.toString() as StringUSDC }))

        return balance
      } catch (e) {
        // If user doesn't have a USDC token account yet, return 0 balance
        if (e instanceof TokenAccountNotFoundError) {
          const balance = BigInt(0) as UsdcWei
          dispatch(setUSDCBalance({ amount: balance.toString() as StringUSDC }))
          return balance
        }
        console.error('Error fetching USDC balance:', e)
        throw e
      }
    },
    enabled: !!ethAddress,
    // TanStack Query's built-in polling - only poll when isPolling is true
    refetchInterval: isPolling ? pollingInterval : false,
    // Prevent refetching when window regains focus during polling to avoid conflicts
    refetchOnWindowFocus: !isPolling,
    ...queryOptions
  })

  // Map TanStack Query states to the Status enum for API compatibility
  let status = Status.IDLE
  if (result.isPending) {
    status = Status.LOADING
  } else if (result.isError) {
    status = Status.ERROR
  } else if (result.isSuccess) {
    status = Status.SUCCESS
  }

  // For compatibility with existing code
  const data = result.data ?? null

  // When the recovery saga finishes, invalidate the balance query so the UI
  // picks up the new balance immediately instead of waiting for the next
  // polling tick. We keep the loading state on through the refetch so the
  // skeleton doesn't flash off and reveal the stale balance.
  const wasRecoveringRef = useRef(false)
  const [isRefetchingAfterRecovery, setIsRefetchingAfterRecovery] =
    useState(false)
  useEffect(() => {
    if (recoveryStatus === Status.LOADING) {
      wasRecoveringRef.current = true
    } else if (
      wasRecoveringRef.current &&
      (recoveryStatus === Status.SUCCESS || recoveryStatus === Status.ERROR)
    ) {
      wasRecoveringRef.current = false
      setIsRefetchingAfterRecovery(true)
      queryClient
        .invalidateQueries({
          queryKey: getUSDCBalanceQueryKey(ethAddress, commitment)
        })
        .finally(() => {
          setIsRefetchingAfterRecovery(false)
        })
    }
  }, [recoveryStatus, queryClient, ethAddress, commitment])

  // If we're actively recovering, or finishing up the post-recovery refetch,
  // keep showing the loading state so consumers render a skeleton/spinner.
  if (recoveryStatus === Status.LOADING || isRefetchingAfterRecovery) {
    status = Status.LOADING
  }

  // Function to cancel polling by invalidating and refetching the query
  // This effectively stops the current polling cycle
  const cancelPolling = useCallback(() => {
    queryClient.cancelQueries({
      queryKey: getUSDCBalanceQueryKey(ethAddress, commitment)
    })
  }, [queryClient, ethAddress, commitment])

  return {
    status,
    isLoading: result.isLoading,
    isPending: result.isPending,
    isError: result.isError,
    data,
    error: result.error,
    refresh: result.refetch,
    cancelPolling
  }
}
