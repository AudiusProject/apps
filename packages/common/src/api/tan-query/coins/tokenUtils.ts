import { Coin, coinMetadataFromCoin, type CoinMetadata } from '~/adapters'
import { CoinInfo } from '~/store/ui/buy-sell/types'

/**
 * Transform a CoinMetadata to CoinInfo for UI use
 */
const coinMetadataToTokenInfo = (coin: CoinMetadata): CoinInfo => ({
  symbol: coin.ticker ?? '',
  name: (coin.name || coin.ticker?.replace(/^\$/, '')) ?? '',
  decimals: coin.decimals ?? 8,
  balance: null, // This would come from user's wallet state
  address: coin.mint,
  logoURI: coin.logoUri ?? '',
  isStablecoin: false // API tokens are never stablecoins, only USDC is (which is frontend-only)
})

export const transformFanClubToTokenInfo = (fanClub: Coin): CoinInfo => {
  const coinMetadata = coinMetadataFromCoin(fanClub)
  return coinMetadataToTokenInfo(coinMetadata)
}

export const transformFanClubsToTokenInfoMap = (
  fanClubs: Coin[]
): Record<string, CoinInfo> => {
  const tokenMap: Record<string, CoinInfo> = {}

  fanClubs.forEach((coin) => {
    const coinMetadata = coinMetadataFromCoin(coin)
    const ticker = coinMetadata.ticker || ''
    if (ticker) {
      tokenMap[ticker] = coinMetadataToTokenInfo(coinMetadata)
    }
  })

  return tokenMap
}
