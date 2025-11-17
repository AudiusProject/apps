import { Coin } from '~/adapters/coin'
import type { CoinGeckoCoinResponse } from '~/api'

import {
  formatCurrencyWithSubscript,
  formatCount,
  formatCurrency
} from './decimal'

export type MetricData = {
  value: string
  rawValue?: string
  label: string
  change?: {
    value: string
    isPositive: boolean
  }
}

const messages = {
  pricePerCoin: 'Price',
  holdersOnAudius: 'Holders on Audius',
  uniqueHolders: 'Unique Holders',
  totalVolume: 'Volume (All-Time)',
  volume24h: 'Volume (24h)',
  marketCap: 'Market Cap',
  graduationProgress: 'Graduation Progress'
}

const formatPercentage = (num: number): string => {
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

const createChangeData = (changePercent: number | undefined) => {
  if (!changePercent || isNaN(changePercent)) {
    return undefined
  }
  return {
    value: formatPercentage(changePercent),
    isPositive: changePercent >= 0
  }
}

const createMetric = ({
  value,
  label,
  changePercent,
  rawValue
}: {
  value: string
  label: string
  changePercent?: number
  rawValue?: string
}): MetricData | null => {
  try {
    return {
      value,
      label,
      rawValue,
      change: createChangeData(changePercent)
    }
  } catch {
    return null
  }
}

export const createCoinMetrics = (coin: Coin): MetricData[] => {
  const potentialMetrics = [
    createMetric({
      value: formatCurrencyWithSubscript(coin.displayPrice),
      label: messages.pricePerCoin,
      changePercent: coin.priceChange24hPercent,
      rawValue: formatCurrency(coin.displayPrice)
    }),
    createMetric({
      value: `$${formatCount(coin.displayMarketCap, 2)}`,
      label: messages.marketCap
    }),
    createMetric({
      value: `$${formatCount(coin.totalVolumeUSD, 2)}`,
      label: messages.totalVolume
    }),
    createMetric({
      value: formatCount(coin.holder),
      label: messages.uniqueHolders
    }),
    createMetric({
      value: `${Math.round((coin.dynamicBondingCurve?.curveProgress ?? 0) * 100)}%`,
      label: messages.graduationProgress
    })
  ]

  return potentialMetrics.filter(
    (metric): metric is MetricData => metric !== null
  )
}

export const createAudioCoinMetrics = (
  coingeckoResponse?: CoinGeckoCoinResponse
) => {
  if (coingeckoResponse === null || coingeckoResponse === undefined) {
    return []
  }

  return [
    createMetric({
      value: formatCurrencyWithSubscript(
        coingeckoResponse.market_data.current_price.usd
      ),
      label: messages.pricePerCoin,
      changePercent: coingeckoResponse.market_data.price_change_percentage_24h,
      rawValue: formatCurrency(coingeckoResponse.market_data.current_price.usd)
    }),
    createMetric({
      value: `$${formatCount(coingeckoResponse.market_data.market_cap.usd, 2)}`,
      label: messages.marketCap
    }),
    createMetric({
      value: `$${formatCount(coingeckoResponse.market_data.total_volume.usd, 2)}`,
      label: messages.volume24h
    })
  ].filter((metric): metric is MetricData => metric !== null)
}
