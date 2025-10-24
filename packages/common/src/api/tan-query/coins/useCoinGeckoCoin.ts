import { queryOptions, useQuery } from '@tanstack/react-query'

type UseCoinGeckoCoinParams = {
  coinId: string
}

export type CoinGeckoCoinResponse = {
  id: string
  symbol: string
  name: string
  market_data: {
    total_supply: number
    circulating_supply: number
    market_cap: {
      usd: number
      [currency: string]: number | undefined
    }
    current_price: {
      usd: number
      [currency: string]: number | undefined
    }
    price_change_percentage_24h: number
    total_volume: {
      usd: number
      [currency: string]: number | undefined
    }
  }
  [key: string]: any
}

const useCoinGeckoCoinQueryOptions = (params: UseCoinGeckoCoinParams) =>
  queryOptions({
    queryKey: ['coinGeckoPrice', params.coinId],
    queryFn: async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${params.coinId}`
      )
      if (!res.ok) {
        throw new Error('Failed to fetch coinGecko price')
      }
      return (await res.json()) as CoinGeckoCoinResponse
    }
  })

export const useCoinGeckoCoin = (
  params: UseCoinGeckoCoinParams,
  options?: Partial<ReturnType<typeof useCoinGeckoCoinQueryOptions>>
) => {
  return useQuery({
    ...options,
    ...useCoinGeckoCoinQueryOptions(params)
  })
}
