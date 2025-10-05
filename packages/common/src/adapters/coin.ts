import {
  HashId,
  type Coin as CoinSDK,
  type UserCoin as UserCoinSdk
} from '@audius/sdk'

import { ID } from '~/models'
import { removeNullable } from '~/utils/typeUtils'

// Define a cleaner coin model without UI dependencies
export type CoinMetadata = {
  mint: string
  name: string | null
  ticker: string | null
  logoUri: string | null
  decimals: number | null
}

// Define a full coin model with ownerId converted to number
export type Coin = Omit<CoinSDK, 'ownerId'> & {
  ownerId: ID
  displayPrice: number
  displayMarketCap: number
}

// Define a UserCoin model with ownerId converted to number
export type UserCoin = Omit<UserCoinSdk, 'ownerId'> & {
  ownerId: ID
}

/**
 * Converts a SDK `Coin` response to internal CoinMetadata
 */
export const coinMetadataFromCoin = (input: CoinSDK | Coin): CoinMetadata => ({
  mint: input.mint,
  name: input.name ?? null,
  ticker: input.ticker ?? null,
  logoUri: input.logoUri ?? null,
  decimals: input.decimals ?? null
})

/**
 * Converts a SDK `Coin` response to Coin, parsing ownerId from HashId string to number
 */
export const coinFromSdk = (input: CoinSDK | undefined): Coin | undefined => {
  if (!input) {
    return undefined
  }

  const decodedOwnerId = HashId.parse(input.ownerId)
  if (!decodedOwnerId) {
    return undefined
  }

  // Birdeye data may not be available right after launch.
  // Fall back to dynamic bonding curve data if so.
  const defaultSupply = 1e9

  const { isMigrated, priceUSD } = input.dynamicBondingCurve
  const hasBirdeyeSupply =
    input.totalSupply !== undefined && input.totalSupply > 0
  const hasBirdeyePrice = input.price !== undefined && input.price > 0

  // For price, use the bonding curve price if the input hasn't graduated or we have no birdeye data
  const displayPrice = !isMigrated || !hasBirdeyePrice ? priceUSD : input.price

  // For market cap, use the bonding curve market cap if the input hasn't graduated or we have no birdeye data
  const displayMarketCap =
    !isMigrated || !hasBirdeyeSupply
      ? displayPrice * (hasBirdeyeSupply ? input.totalSupply : defaultSupply)
      : input.marketCap

  const { ownerId: _ignored, ...rest } = input
  return {
    ...rest,
    ownerId: decodedOwnerId,
    displayPrice,
    displayMarketCap
  }
}

/**
 * Converts a list of SDK `Coin` responses to CoinMetadata list
 */
export const coinMetadataListFromSDK = (input?: CoinSDK[]): CoinMetadata[] =>
  input ? input.map(coinMetadataFromCoin).filter(removeNullable) : []

/**
 * Converts a SDK `UserCoin` response to UserCoin, parsing ownerId from HashId string to number
 */
export const userCoinFromSdk = (input: UserCoinSdk): UserCoin | undefined => {
  const decodedOwnerId = HashId.parse(input.ownerId)
  if (!decodedOwnerId) {
    return undefined
  }

  const { ownerId: _ignored, ...rest } = input
  return {
    ...rest,
    ownerId: decodedOwnerId
  }
}

/**
 * Converts a list of SDK `Coin` responses to Coin list (with parsed ownerId)
 */
export const coinListFromSDK = (input?: CoinSDK[]): Coin[] =>
  input ? input.map(coinFromSdk).filter(removeNullable) : []

/**
 * Converts a list of SDK `UserCoin` responses to UserCoin list (with parsed ownerId)
 */
export const userCoinListFromSDK = (input?: UserCoinSdk[]): UserCoin[] =>
  input ? input.map(userCoinFromSdk).filter(removeNullable) : []

/**
 * Creates a map of coins keyed by ticker symbol
 */
export const coinMapFromSDK = (
  input?: CoinSDK[]
): Record<string, CoinMetadata> => {
  const coinMap: Record<string, CoinMetadata> = {}

  if (input) {
    input.forEach((coin) => {
      const coinMetadata = coinMetadataFromCoin(coin)
      if (coinMetadata.ticker) {
        coinMap[coinMetadata.ticker] = coinMetadata
      }
    })
  }

  return coinMap
}

/**
 * Gets all token symbols from a list of coins
 */
export const getTokenSymbolsFromCoins = (coins: CoinMetadata[]): string[] =>
  coins.map((coin) => coin.ticker || '').filter(Boolean)

/**
 * Gets token mints by symbol from a list of coins
 */
export const getTokenMintsBySymbolsFromCoins = (
  coins: CoinMetadata[],
  symbols: string[]
): string[] =>
  coins
    .filter((coin) => coin.ticker && symbols.includes(coin.ticker))
    .map((coin) => coin.mint)
