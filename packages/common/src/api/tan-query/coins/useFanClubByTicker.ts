import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryFunctionContext
} from '@tanstack/react-query'

import { coinFromSdk } from '~/adapters/coin'
import {
  useQueryContext,
  type QueryContextType
} from '~/api/tan-query/utils/QueryContext'
import { formatTicker } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { combineQueryStatuses } from '../utils'

import { useFanClub, getFanClubQueryKey } from './useFanClub'

/**
 * Function to check if a coin ticker is available for use.
 * Returns true if available, false if taken.
 * Handles 404 errors gracefully without reporting them to Sentry.
 */
export const fetchCoinTickerAvailability = async (
  ticker: string,
  { audiusSdk }: Pick<QueryContextType, 'audiusSdk'>
) => {
  if (!ticker || ticker.length < 2) {
    return { available: false }
  }

  const sdk = await audiusSdk()
  try {
    // Use getCoinByTicker - if it returns a coin, the ticker is taken
    await sdk.coins.getCoinByTicker({ ticker: formatTicker(ticker) })
    // If we get a coin back, the ticker is not available
    return { available: false }
  } catch (error: any) {
    // The API returns 404 if ticker is available (no coin found with that ticker)
    if ('response' in error && error.response.status === 404) {
      return { available: true }
    }
    // For other errors, throw them so they can be handled by React Query
    throw error
  }
}

export interface UseFanClubByTickerParams {
  ticker: string
}

const getFanClubByTickerQueryKey = (ticker: string) =>
  [QUERY_KEYS.coinByTicker, ticker] as const

type FetchFanClubByTickerContext = Pick<QueryContextType, 'audiusSdk'> & {
  queryClient: any
}

const getFanClubByTickerQueryFn =
  (context: FetchFanClubByTickerContext) =>
  async ({
    queryKey
  }: QueryFunctionContext<ReturnType<typeof getFanClubByTickerQueryKey>>) => {
    const [_ignored, ticker] = queryKey
    const { audiusSdk } = context
    const sdk = await audiusSdk()
    // NOTE: Might not need to format the ticker here, but being safe
    const response = await sdk.coins.getCoinByTicker({
      ticker: formatTicker(ticker)
    })
    const coin = coinFromSdk(response.data)

    // Prime the fan club query key if we have the mint
    if (coin?.mint) {
      context.queryClient.setQueryData(getFanClubQueryKey(coin.mint), coin)
    }

    return coin?.mint
  }

/**
 * Helper function to get the query options for fetching an fan club by ticker.
 * Useful for getting the query key tagged with the data type stored in the cache.
 */
export const getFanClubByTickerOptions = (
  context: FetchFanClubByTickerContext,
  { ticker }: UseFanClubByTickerParams
) => {
  return queryOptions({
    queryKey: getFanClubByTickerQueryKey(formatTicker(ticker)),
    queryFn: getFanClubByTickerQueryFn(context),
    enabled: !!ticker
  })
}

export const useFanClubByTicker = (
  params: UseFanClubByTickerParams,
  options?: Partial<ReturnType<typeof getFanClubByTickerOptions>>
) => {
  const context = useQueryContext()
  const queryClient = useQueryClient()

  const mintQuery = useQuery({
    ...options,
    ...getFanClubByTickerOptions(
      { ...context, queryClient },
      { ...params, ticker: formatTicker(params.ticker) }
    )
  })

  const coinQuery = useFanClub(mintQuery.data!)

  // Return the coin query result, but surface errors from the mint lookup
  return {
    ...combineQueryStatuses([mintQuery, coinQuery]),
    data: coinQuery.data
  }
}
