import {
  HashId,
  type Coin as CoinSDK,
  type UserCoin as UserCoinSdk
} from '@audius/sdk'

import { ID } from '~/models'
import { removeNullable } from '~/utils/typeUtils'

export type CoinMetadata = {
  mint: string
  name: string | null
  ticker: string | null
  logoUri: string | null
  decimals: number | null
}

export type Coin = Omit<CoinSDK, 'ownerId'> & {
  ownerId: ID
  displayPrice: number
  displayMarketCap: number
}

export type UserCoin = Omit<UserCoinSdk, 'ownerId'> & {
  ownerId: ID
}

export const coinMetadataFromCoin = (input: CoinSDK | Coin): CoinMetadata => ({
  mint: input.mint,
  name: input.name ?? null,
  ticker: input.ticker ?? null,
  logoUri: input.logoUri ?? null,
  decimals: input.decimals ?? null
})

export const coinFromSdk = (input: CoinSDK | undefined): Coin | undefined => {
  if (!input) {
    return undefined
  }

  const decodedOwnerId = HashId.parse(input.ownerId)
  if (!decodedOwnerId) {
    return undefined
  }

  const defaultSupply = 1e9
  const dbc = input.dynamicBondingCurve
  if (!dbc) {
    return undefined
  }

  const { isMigrated, priceUSD, address } = dbc
  const hasBirdeyeSupply =
    input.totalSupply !== undefined && input.totalSupply > 0
  const hasBirdeyePrice = input.price !== undefined && input.price > 0

  const hasBondingCurveData = !!address

  const displayPrice =
    (!isMigrated && hasBondingCurveData) || !hasBirdeyePrice
      ? (priceUSD ?? 0)
      : (input.price ?? 0)

  const displayMarketCap =
    (!isMigrated && hasBondingCurveData) || !hasBirdeyeSupply
      ? displayPrice *
        (hasBirdeyeSupply ? (input.totalSupply ?? 0) : defaultSupply)
      : (input.marketCap ?? 0)

  const { ownerId: _ignored, ...rest } = input
  return {
    ...rest,
    ownerId: decodedOwnerId,
    displayPrice,
    displayMarketCap
  }
}

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

export const coinListFromSDK = (input?: CoinSDK[]): Coin[] =>
  input ? input.map(coinFromSdk).filter(removeNullable) : []

export const userCoinListFromSDK = (input?: UserCoinSdk[]): UserCoin[] =>
  input ? input.map(userCoinFromSdk).filter(removeNullable) : []
