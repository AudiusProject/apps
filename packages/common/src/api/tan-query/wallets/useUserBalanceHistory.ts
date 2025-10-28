import { useQuery } from '@tanstack/react-query'

import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type BalanceHistoryDataPoint = {
  timestamp: number
  balanceUsd: number
}

type UseUserBalanceHistoryParams = {
  userId?: number
  enabled?: boolean
}

/**
 * Mock hook for getting user balance history (coins + USDC + AUDIO in USD).
 * Returns hourly data points for the past week.
 * TODO: Replace with real API call when backend is ready
 */
export const useUserBalanceHistory = (
  params: UseUserBalanceHistoryParams = {},
  options?: QueryOptions
) => {
  const { data: currentUserId } = useCurrentUserId()
  const userId = params.userId ?? currentUserId

  return useQuery({
    queryKey: ['userBalanceHistory', userId],
    queryFn: async (): Promise<BalanceHistoryDataPoint[]> => {
      // Mock data: Generate hourly data points for the past week (7 days * 24 hours = 168 data points)
      const now = Date.now()
      const oneHour = 60 * 60 * 1000
      const oneWeek = 7 * 24 * oneHour
      const startTime = now - oneWeek

      const dataPoints: BalanceHistoryDataPoint[] = []

      // Generate realistic-looking balance data with some variance
      const baseBalance = 5000 // Base balance in USD
      let previousBalance = baseBalance

      for (let i = 0; i <= 168; i++) {
        const timestamp = startTime + i * oneHour

        // Add some realistic variance (±2% per hour with trend)
        const randomVariance = (Math.random() - 0.48) * 0.02
        const trendVariance = Math.sin(i / 20) * 0.01 // Slight upward/downward trend
        const totalVariance = 1 + randomVariance + trendVariance

        const newBalance = previousBalance * totalVariance
        previousBalance = newBalance

        dataPoints.push({
          timestamp,
          balanceUsd: Math.round(newBalance * 100) / 100 // Round to 2 decimals
        })
      }

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      return dataPoints
    },
    enabled: !!userId && (params.enabled ?? true) && (options?.enabled ?? true),
    staleTime: 60000, // 1 minute
    ...options
  })
}
