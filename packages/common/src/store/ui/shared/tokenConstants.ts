import TokenAUDIOPng from '@audius/harmony/src/assets/icons/TokenAUDIO.png'

import { JupiterTokenListing } from '../buy-audio/types'

/**
 * Base token metadata without environment-specific addresses
 */
const BASE_TOKEN_METADATA = {
  AUDIO: {
    chainId: 101,
    symbol: 'AUDIO',
    name: 'Audius Coin',
    decimals: 8,
    logoURI: TokenAUDIOPng as string
  },
  SOL: {
    chainId: 101,
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  USDC: {
    chainId: 101,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  },
  BONK: {
    chainId: 101,
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png'
  }
} as const

/**
 * Legacy token listing map with hardcoded addresses for backward compatibility
 */
export const TOKEN_LISTING_MAP: Record<string, JupiterTokenListing> = {
  AUDIO: {
    ...BASE_TOKEN_METADATA.AUDIO,
    address: '9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM'
  },
  SOL: {
    ...BASE_TOKEN_METADATA.SOL
  },
  USDC: {
    ...BASE_TOKEN_METADATA.USDC,
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  },
  BONK: {
    ...BASE_TOKEN_METADATA.BONK,
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
  }
}
