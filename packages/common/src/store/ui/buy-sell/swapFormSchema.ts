import { FixedDecimal } from '@audius/fixed-decimal'
import { z } from 'zod'

import { buySellMessages as messages } from '../../../messages'

import { CoinInfo } from './types/swap.types'

/**
 * Schema for validating token swap input
 */
export const createSwapFormSchema = (
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER,
  balance: number | undefined = undefined,
  tokenSymbol: string = '',
  decimals: number = 8
) =>
  z.object({
    inputAmount: z
      .string()
      .refine(
        (val) => {
          // Allow empty string during typing, but require it for final validation
          if (val === '') return false
          try {
            // eslint-disable-next-line no-new
            new FixedDecimal(val, decimals)
            return true
          } catch {
            return false
          }
        },
        {
          message: messages.emptyAmount
        }
      )
      .refine(
        (val) => {
          if (val === '') return false
          try {
            const amount = new FixedDecimal(val, decimals)
            const minAmount = new FixedDecimal(min, decimals)
            return amount.value >= minAmount.value
          } catch {
            return false
          }
        },
        {
          message: messages.minAmount(min, tokenSymbol)
        }
      )
      .refine(
        (val) => {
          if (val === '') return false
          try {
            const amount = new FixedDecimal(val, decimals)
            const maxAmount = new FixedDecimal(max, decimals)
            return amount.value <= maxAmount.value
          } catch {
            return false
          }
        },
        {
          message: messages.maxAmount(max, tokenSymbol)
        }
      )
      .refine(
        (val) => {
          if (val === '') return false
          // Treat only null/undefined as "unknown balance"; do not bypass check for numeric 0
          if (balance == null || balance === undefined) return true
          try {
            const amount = new FixedDecimal(val, decimals)
            const balanceAmount = new FixedDecimal(balance, decimals)
            return amount.value <= balanceAmount.value
          } catch {
            return false
          }
        },
        {
          message: messages.insufficientBalance(tokenSymbol)
        }
      ),
    outputAmount: z.string().optional()
  })

export type SwapFormValues = {
  inputAmount: string
  outputAmount: string
  selectedInputToken: CoinInfo
  selectedOutputToken: CoinInfo
}
