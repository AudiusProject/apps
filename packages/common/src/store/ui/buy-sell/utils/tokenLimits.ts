import { TOKEN_LISTING_MAP } from '../../shared/tokenConstants'
import { MIN_SWAP_AMOUNT_USD, MAX_SWAP_AMOUNT_USD } from '../constants'
import type { TokenLimits, TokenLimitInput } from '../types/swap.types'

export const calculateTokenLimits = (
  tokenPrice: number | null,
  isStablecoin: boolean,
  tokenAddress?: string
): TokenLimits => {
  if (isStablecoin) {
    return {
      min: MIN_SWAP_AMOUNT_USD,
      max: MAX_SWAP_AMOUNT_USD
    }
  }

  const isSOL = tokenAddress === TOKEN_LISTING_MAP.SOL.address

  if (!tokenPrice || tokenPrice <= 0) {
    if (isSOL) {
      return {
        min: 0.000001, // Same as fan clubs launchpad
        max: 1000000
      }
    } else {
      return {
        min: 1, // Fan clubs are very cheap
        max: 1000000
      }
    }
  }

  return {
    min: MIN_SWAP_AMOUNT_USD / tokenPrice,
    max: MAX_SWAP_AMOUNT_USD / tokenPrice
  }
}

export const resolveTokenLimits = (input: TokenLimitInput): TokenLimits => {
  const { tokenPrice, isStablecoin, providedMin, providedMax, tokenAddress } =
    input

  const { min } = calculateTokenLimits(tokenPrice, isStablecoin, tokenAddress)
  return {
    min: providedMin ?? min,
    max: providedMax ?? Number.MAX_SAFE_INTEGER
  }
}

export const usdToTokenAmount = (
  usdAmount: number,
  tokenPrice: number,
  isStablecoin: boolean
): number => {
  if (isStablecoin) {
    return usdAmount
  }

  if (!tokenPrice || tokenPrice <= 0) {
    return 0
  }

  return usdAmount / tokenPrice
}

export const tokenToUsdAmount = (
  tokenAmount: number,
  tokenPrice: number,
  isStablecoin: boolean
): number => {
  if (isStablecoin) {
    return tokenAmount
  }

  if (!tokenPrice || tokenPrice <= 0) {
    return 0
  }

  return tokenAmount * tokenPrice
}

export const isAmountWithinLimits = (
  amount: number,
  limits: TokenLimits
): { isValid: boolean; reason?: string } => {
  if (amount < limits.min) {
    return {
      isValid: false,
      reason: `Amount must be at least ${limits.min}`
    }
  }

  if (amount > limits.max) {
    return {
      isValid: false,
      reason: `Amount cannot exceed ${limits.max}`
    }
  }

  return { isValid: true }
}

export const getUsdLimitRange = (): { min: number; max: number } => {
  return {
    min: MIN_SWAP_AMOUNT_USD,
    max: MAX_SWAP_AMOUNT_USD
  }
}

export const formatLimitAmount = (
  amount: number,
  decimals: number = 6
): string => {
  if (amount < 1) {
    return amount.toFixed(Math.min(decimals, 8))
  }

  if (amount > 1000) {
    return amount.toFixed(2)
  }

  return amount.toFixed(4)
}
