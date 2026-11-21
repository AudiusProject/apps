import { useCallback, useEffect, useRef, useState } from 'react'

import { UsdcWei } from '@audius/fixed-decimal'
import type { Commitment } from '@solana/web3.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'

import { useCurrentAccountUser } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { Status } from '~/models/Status'
import { StringUSDC } from '~/models/Wallet'
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
      const [{ getUserbankAccountInfo }, { TokenAccountNotFoundError }] =
        await Promise.all([
          import('~/services/audius-backend/solana'),
          import('@solana/spl-token')
        ])

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

        dispatch(setUSDCBalance({ amount: balance?.toString() as StringUSDC }))

        return balance
      } catch (e) {
        if (e instanceof TokenAccountNotFoundError) {
          const balance = BigInt(0) as UsdcWei
          dispatch(setUSDCBalance({ amount: balance.toString() as StringUSDC }))
          return balance
        }
        console.error('Error fetching USDC balance:', e)
        throw e
      }
    },
    refetchInterval: isPolling ? pollingInterval : false,
    refetchOnWindowFocus: !isPolling,
    ...queryOptions,
    enabled: !!ethAddress && queryOptions.enabled !== false
  })

  let status = Status.IDLE
  if (result.isPending) {
    status = Status.LOADING
  } else if (result.isError) {
    status = Status.ERROR
  } else if (result.isSuccess) {
    status = Status.SUCCESS
  }

  const data = result.data ?? null

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

  if (recoveryStatus === Status.LOADING || isRefetchingAfterRecovery) {
    status = Status.LOADING
  }

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
