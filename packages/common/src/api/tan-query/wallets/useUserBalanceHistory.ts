import { Id, type GetUserBalanceHistoryGranularityEnum } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import type { QueryKey, SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils/QueryContext'

export type BalanceHistoryDataPoint = {
  timestamp: number
  balanceUsd: number
}

export type UseUserBalanceHistoryParams = {
  userId: ID | null | undefined
  startTime?: string | Date
  endTime?: string | Date
  granularity?: GetUserBalanceHistoryGranularityEnum
}

export const getUserBalanceHistoryQueryKey = (
  params: UseUserBalanceHistoryParams
) =>
  [
    QUERY_KEYS.userBalanceHistory,
    params.userId,
    params.startTime,
    params.endTime,
    params.granularity
  ] as unknown as QueryKey<BalanceHistoryDataPoint[]>

/**
 * Hook to fetch user balance history
 * @param params - Parameters for fetching balance history
 * @param options - TanStack Query options
 * @returns Query result with balance history data points
 */
export const useUserBalanceHistory = <TResult = BalanceHistoryDataPoint[]>(
  params: UseUserBalanceHistoryParams,
  options?: SelectableQueryOptions<BalanceHistoryDataPoint[], TResult>
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getUserBalanceHistoryQueryKey(params),
    queryFn: async () => {
      if (!params.userId) {
        return []
      }

      const sdk = await audiusSdk()
      const requestParams: {
        id: string
        startTime?: Date
        endTime?: Date
        granularity?: GetUserBalanceHistoryGranularityEnum
      } = {
        id: Id.parse(params.userId)
      }

      if (params.startTime) {
        requestParams.startTime =
          typeof params.startTime === 'string'
            ? new Date(params.startTime)
            : params.startTime
      }
      if (params.endTime) {
        requestParams.endTime =
          typeof params.endTime === 'string'
            ? new Date(params.endTime)
            : params.endTime
      }
      if (params.granularity) {
        requestParams.granularity = params.granularity
      }

      const response = await sdk.users.getUserBalanceHistory(requestParams)

      // Map from SDK response format to our hook's return type (SDK uses camelCase)
      // Convert timestamp from seconds to milliseconds for JavaScript Date
      return (
        response.data?.map((point) => ({
          timestamp: point.timestamp * 1000,
          balanceUsd: point.balanceUsd
        })) ?? []
      )
    },
    enabled: options?.enabled !== false && !!params.userId,
    ...options
  })
}
