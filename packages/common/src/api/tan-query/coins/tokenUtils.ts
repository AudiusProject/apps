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

export const transformArtistCoinToTokenInfo = (artistCoin: Coin): CoinInfo => {
  const coinMetadata = coinMetadataFromCoin(artistCoin)
  return coinMetadataToTokenInfo(coinMetadata)
}

export const transformArtistCoinsToTokenInfoMap = (
  artistCoins: Coin[]
): Record<string, CoinInfo> => {
  const tokenMap: Record<string, CoinInfo> = {}

  artistCoins.forEach((coin) => {
    const coinMetadata = coinMetadataFromCoin(coin)
    const ticker = coinMetadata.ticker || ''
    if (ticker) {
      tokenMap[ticker] = coinMetadataToTokenInfo(coinMetadata)
    }
  })

  return tokenMap
}
