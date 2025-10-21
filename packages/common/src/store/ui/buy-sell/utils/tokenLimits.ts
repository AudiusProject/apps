/**
 * Utilities for calculating token swap limits based on USD constraints
 */

import { MIN_SWAP_AMOUNT_USD, MAX_SWAP_AMOUNT_USD } from '../constants'
import { TOKEN_LISTING_MAP } from '../../shared/tokenConstants'
import type { TokenLimits, TokenLimitInput } from '../types/swap.types'

/**
 * Calculates min/max token amounts based on USD limits and current token price
 * For stablecoins, assumes 1:1 parity with USD
 * For SOL, uses very small minimum (0.000001) since it's expensive
 * For artist coins, uses minimum of 1 since they're very cheap
 * For other tokens, converts USD limits using current price
 */
export const calculateTokenLimits = (
  tokenPrice: number | null,
  isStablecoin: boolean,
  tokenAddress?: string
): TokenLimits => {
  if (isStablecoin) {
    // For stablecoins like USDC, 1 token ≈ $1 USD
    return {
      min: MIN_SWAP_AMOUNT_USD,
      max: MAX_SWAP_AMOUNT_USD
    }
  }

  // Check if this is SOL (native Solana token)
  const isSOL = tokenAddress === TOKEN_LISTING_MAP.SOL.address

  if (!tokenPrice || tokenPrice <= 0) {
    // Fallback to reasonable defaults if price is unavailable
    if (isSOL) {
      // SOL is expensive, use very small minimum
      return {
        min: 0.000001, // Same as artist coins launchpad
        max: 1000000
      }
    } else {
      // Artist coins are cheap, use minimum of 1
      return {
        min: 1, // Artist coins are very cheap
        max: 1000000
      }
    }
  }

  return {
    min: MIN_SWAP_AMOUNT_USD / tokenPrice,
    max: MAX_SWAP_AMOUNT_USD / tokenPrice
  }
}

/**
 * Determines the final token limits considering provided overrides
 * Allows for manual override of calculated limits
 */
export const resolveTokenLimits = (input: TokenLimitInput): TokenLimits => {
  const { tokenPrice, isStablecoin, providedMin, providedMax, tokenAddress } = input

  // Otherwise, calculate based on USD limits and price for minimum only
  const { min } = calculateTokenLimits(tokenPrice, isStablecoin, tokenAddress)
  return {
    min: providedMin ?? min,
    max: providedMax ?? Number.MAX_SAFE_INTEGER
  }
}

/**
 * Converts a USD amount to token amount using current price
 */
export const usdToTokenAmount = (
  usdAmount: number,
  tokenPrice: number,
  isStablecoin: boolean
): number => {
  if (isStablecoin) {
    return usdAmount // 1:1 for stablecoins
  }

  if (!tokenPrice || tokenPrice <= 0) {
    return 0
  }

  return usdAmount / tokenPrice
}

/**
 * Converts a token amount to USD using current price
 */
export const tokenToUsdAmount = (
  tokenAmount: number,
  tokenPrice: number,
  isStablecoin: boolean
): number => {
  if (isStablecoin) {
    return tokenAmount // 1:1 for stablecoins
  }

  if (!tokenPrice || tokenPrice <= 0) {
    return 0
  }

  return tokenAmount * tokenPrice
}

/**
 * Validates if a token amount is within the calculated limits
 */
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

/**
 * Gets the USD equivalent range for display purposes
 */
export const getUsdLimitRange = (): { min: number; max: number } => {
  return {
    min: MIN_SWAP_AMOUNT_USD,
    max: MAX_SWAP_AMOUNT_USD
  }
}

/**
 * Formats limit amounts for display with appropriate precision
 */
export const formatLimitAmount = (
  amount: number,
  decimals: number = 6
): string => {
  // For very small amounts, show more precision
  if (amount < 1) {
    return amount.toFixed(Math.min(decimals, 8))
  }

  // For larger amounts, show fewer decimals
  if (amount > 1000) {
    return amount.toFixed(2)
  }

  return amount.toFixed(4)
}
