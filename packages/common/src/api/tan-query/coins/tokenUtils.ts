import { Coin, coinMetadataFromCoin, type CoinMetadata } from '~/adapters'
import { CoinInfo } from '~/store/ui/buy-sell/types'

/**
 * Transform a CoinMetadata to CoinInfo for UI use
 */
const coinMetadataToTokenInfo = (
  coin: CoinMetadata
): Omit<CoinInfo, 'dbcPoolAddress' | 'connection'> => ({
  symbol: coin.ticker ?? '',
  name: (coin.name || coin.ticker?.replace(/^\$/, '')) ?? '',
  decimals: coin.decimals ?? 8,
  balance: null, // This would come from user's wallet state
  address: coin.mint,
  logoURI: coin.logoUri ?? '',
  isStablecoin: false // API tokens are never stablecoins, only USDC is (which is frontend-only)
})

export const transformArtistCoinToTokenInfo = (
  artistCoin: Coin,
  connection?: any
): CoinInfo => {
  const coinMetadata = coinMetadataFromCoin(artistCoin)
  const baseCoinInfo = coinMetadataToTokenInfo(coinMetadata)

  return {
    ...baseCoinInfo,
    dbcPoolAddress: artistCoin.dynamicBondingCurve?.address,
    connection
  }
}

export const transformArtistCoinsToTokenInfoMap = (
  artistCoins: Coin[],
  connection?: any
): Record<string, CoinInfo> => {
  const tokenMap: Record<string, CoinInfo> = {}

  artistCoins.forEach((coin) => {
    const coinMetadata = coinMetadataFromCoin(coin)
    const ticker = coinMetadata.ticker || ''
    if (ticker) {
      tokenMap[ticker] = transformArtistCoinToTokenInfo(coin, connection)
    }
  })

  return tokenMap
}
