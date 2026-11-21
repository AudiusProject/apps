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

export const fetchCoinTickerAvailability = async (
  ticker: string,
  { audiusSdk }: Pick<QueryContextType, 'audiusSdk'>
) => {
  if (!ticker || ticker.length < 2) {
    return { available: false }
  }

  const sdk = await audiusSdk()
  try {
    await sdk.coins.getCoinByTicker({ ticker: formatTicker(ticker) })
    return { available: false }
  } catch (error: any) {
    if ('response' in error && error.response.status === 404) {
      return { available: true }
    }
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
    const response = await sdk.coins.getCoinByTicker({
      ticker: formatTicker(ticker)
    })
    const coin = coinFromSdk(response.data)

    if (coin?.mint) {
      context.queryClient.setQueryData(getFanClubQueryKey(coin.mint), coin)
    }

    return coin?.mint
  }

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

  return {
    ...combineQueryStatuses([mintQuery, coinQuery]),
    data: coinQuery.data
  }
}
