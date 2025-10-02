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

import { QUERY_KEYS } from '../queryKeys'

import { useArtistCoin, getArtistCoinQueryKey } from './useArtistCoin'

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
    await sdk.coins.getCoinByTicker({ ticker: `$${ticker}` })
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

export interface UseArtistCoinByTickerParams {
  ticker: string
}

const getArtistCoinByTickerQueryKey = (ticker: string) =>
  [QUERY_KEYS.coinByTicker, ticker] as const

type FetchArtistCoinByTickerContext = Pick<QueryContextType, 'audiusSdk'> & {
  queryClient: any
}

const getArtistCoinByTickerQueryFn =
  (context: FetchArtistCoinByTickerContext) =>
  async ({
    queryKey
  }: QueryFunctionContext<
    ReturnType<typeof getArtistCoinByTickerQueryKey>
  >) => {
    const [_ignored, ticker] = queryKey
    const { audiusSdk } = context
    const sdk = await audiusSdk()
    const response = await sdk.coins.getCoinByTicker({
      ticker
    })
    const coin = coinFromSdk(response.data)

    // Prime the artist coin query key if we have the mint
    if (coin?.mint) {
      context.queryClient.setQueryData(getArtistCoinQueryKey(coin.mint), coin)
    }

    return coin?.mint
  }

/**
 * Helper function to get the query options for fetching an artist coin by ticker.
 * Useful for getting the query key tagged with the data type stored in the cache.
 */
export const getArtistCoinByTickerOptions = (
  context: FetchArtistCoinByTickerContext,
  { ticker }: UseArtistCoinByTickerParams
) => {
  return queryOptions({
    queryKey: getArtistCoinByTickerQueryKey(ticker),
    queryFn: getArtistCoinByTickerQueryFn(context),
    enabled: !!ticker
  })
}

export const useArtistCoinByTicker = (
  params: UseArtistCoinByTickerParams,
  options?: Partial<ReturnType<typeof getArtistCoinByTickerOptions>>
) => {
  const context = useQueryContext()
  const queryClient = useQueryClient()

  const { data: mint } = useQuery({
    ...options,
    ...getArtistCoinByTickerOptions({ ...context, queryClient }, params)
  })

  return useArtistCoin(mint!)
}
