import { z } from 'zod'

export const GasFeeSchema = z
  .union([
    z.object({
      // Legacy
      gasPrice: z.bigint().optional()
    }),
    z.object({
      // EIP-1559
      maxFeePerGas: z.bigint().optional(),
      maxPriorityFeePerGas: z.bigint().optional()
    })
  ])
  .and(
    z.object({
      gas: z.bigint().optional()
    })
  )
