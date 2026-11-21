import { CoinInfo, CoinPair } from '~/store'

export const normalizeTokenSymbol = (symbol: string): string => {
  if (!symbol || typeof symbol !== 'string') {
    console.warn('normalizeTokenSymbol: Invalid symbol provided:', symbol)
    return ''
  }
  return symbol.replace(/^\$/, '')
}

export const createFallbackPair = (): CoinPair => ({
  baseToken: {
    symbol: 'AUDIO',
    name: 'Audius',
    decimals: 8,
    balance: null,
    address: '',
    logoURI: '',
    isStablecoin: false
  },
  quoteToken: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: null,
    address: '',
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    isStablecoin: true
  },
  exchangeRate: null
})

export const createPairFromSymbols = (
  baseSymbol: string,
  quoteSymbol: string,
  tokens: Record<string, CoinInfo>
): CoinPair | null => {
  const baseToken = findTokenBySymbol(baseSymbol, tokens)
  const quoteToken = findTokenBySymbol(quoteSymbol, tokens)

  if (!baseToken || !quoteToken) return null

  return {
    baseToken,
    quoteToken,
    exchangeRate: null
  }
}

export const findTokenBySymbol = (
  symbol: string,
  tokens: Record<string, CoinInfo>
): CoinInfo | null => {
  if (!symbol || typeof symbol !== 'string') {
    return null
  }

  if (!tokens || typeof tokens !== 'object') {
    return null
  }

  if (tokens[symbol]) return tokens[symbol]

  const normalized = normalizeTokenSymbol(symbol)
  if (tokens[normalized]) return tokens[normalized]

  if (tokens[`$${normalized}`]) return tokens[`$${normalized}`]

  return null
}

export const findTokenByAddress = (
  address: string,
  tokens: Record<string, CoinInfo>
): CoinInfo | null => {
  if (!address || typeof address !== 'string') {
    return null
  }

  if (!tokens || typeof tokens !== 'object') {
    return null
  }

  const token = Object.values(tokens).find((token) => token.address === address)

  return token || null
}
