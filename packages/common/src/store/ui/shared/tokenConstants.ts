import TokenAUDIOPng from '@audius/harmony/src/assets/icons/TokenAUDIO.png'

/**
 * From Jupiter API documentation:
 * https://docs.jup.ag/jupiter-core/jupiter-sdk/v2/full-guide
 * "6. Configure the input token, output token"
 */
export type JupiterTokenListing = {
  chainId: number // 101,
  address: string // 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: string // 'USDC',
  name: string // 'Wrapped USDC',
  decimals: number // 6,
  logoURI: string // 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW/logo.png',
}

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

export const AUDIO_MINT = '9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM'
export const SOL_MINT = 'So11111111111111111111111111111111111111112'
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'

export const NON_ARTIST_COIN_MINTS = [
  AUDIO_MINT,
  SOL_MINT,
  USDC_MINT,
  BONK_MINT
]

/**
 * Legacy token listing map with hardcoded addresses for backward compatibility
 */
export const TOKEN_LISTING_MAP: Record<string, JupiterTokenListing> = {
  AUDIO: {
    ...BASE_TOKEN_METADATA.AUDIO,
    address: AUDIO_MINT
  },
  SOL: {
    ...BASE_TOKEN_METADATA.SOL
  },
  USDC: {
    ...BASE_TOKEN_METADATA.USDC,
    address: USDC_MINT
  },
  BONK: {
    ...BASE_TOKEN_METADATA.BONK,
    address: BONK_MINT
  }
}

export type JupiterTokenSymbol = keyof typeof TOKEN_LISTING_MAP

export type AmountObject = {
  amount: number
  amountString: string
  uiAmount: number
  uiAmountString: string
}
