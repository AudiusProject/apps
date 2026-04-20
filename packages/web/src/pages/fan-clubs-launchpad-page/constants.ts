export const AMOUNT_OF_STEPS = 3

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024 // 15MB

export enum Phase {
  SPLASH,
  SETUP,
  REVIEW,
  BUY_COIN
}

export const LAUNCHPAD_COIN_DESCRIPTION = (
  artistHandle: string,
  coinTicker: string
) => {
  return `$${coinTicker?.toUpperCase()} is an artist coin created by @${artistHandle} on Audius. Learn more at https://audius.co/coins/${coinTicker?.toUpperCase()}`
}

export const SOLANA_DECIMALS = 9
export const AUDIO_DECIMALS = 8
export const USDC_DECIMALS = 6
export const TOKEN_DECIMALS = 9

export const MIN_SOL_BALANCE = 30000000 // 0.03 SOL - Minimum amount to launch a coin is 0.0245 SOL + a bit extra for swap fees
