import { PublicClient } from 'viem'
import { z } from 'zod'

import { SdkServicesConfig } from '../../../config/types'

export type EthereumContractConfigInternal = {
  /** Ethereum RPC Endpoint */
  rpcEndpoint: string
  /** Viem client */
  client: PublicClient
  /** Contract addesses */
  addresses: SdkServicesConfig['ethereum']['addresses']
}

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
