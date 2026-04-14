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

const DEFAULT_HISTORY_DAYS = 7

/**
 * Returns the default start time for balance history queries: midnight UTC,
 * `DEFAULT_HISTORY_DAYS` days ago. Rounded to the day so that repeated calls
 * within the same day produce the same value — this keeps the query key stable
 * and lets react-query share the cache across components.
 */
const getDefaultStartTime = (): Date => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - DEFAULT_HISTORY_DAYS)
  return date
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

  // Default to a 7-day window when the caller doesn't specify one. We fill it
  // in here (rather than relying on the API default) so that daily-granularity
  // queries get a consistent 7-day range instead of the full history.
  const resolvedStartTime = params.startTime ?? getDefaultStartTime()
  const resolvedParams: UseUserBalanceHistoryParams = {
    ...params,
    startTime: resolvedStartTime
  }

  return useQuery({
    queryKey: getUserBalanceHistoryQueryKey(resolvedParams),
    queryFn: async () => {
      if (!resolvedParams.userId) {
        return []
      }

      const sdk = await audiusSdk()
      const requestParams: {
        id: string
        startTime?: Date
        endTime?: Date
        granularity?: GetUserBalanceHistoryGranularityEnum
      } = {
        id: Id.parse(resolvedParams.userId)
      }

      if (resolvedParams.startTime) {
        requestParams.startTime =
          typeof resolvedParams.startTime === 'string'
            ? new Date(resolvedParams.startTime)
            : resolvedParams.startTime
      }
      if (resolvedParams.endTime) {
        requestParams.endTime =
          typeof resolvedParams.endTime === 'string'
            ? new Date(resolvedParams.endTime)
            : resolvedParams.endTime
      }
      if (resolvedParams.granularity) {
        requestParams.granularity = resolvedParams.granularity
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
    enabled: options?.enabled !== false && !!resolvedParams.userId,
    ...options
  })
}
