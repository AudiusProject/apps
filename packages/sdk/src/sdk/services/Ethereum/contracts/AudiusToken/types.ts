import type { Account, Hex, PublicClient, Transport, WalletClient } from 'viem'
import type { mainnet } from 'viem/chains'
import { z } from 'zod'

import { EthAddressSchema } from '../../../../types/EthAddress'
import type { AudiusWalletClient } from '../../../AudiusWalletClient'
import { GasFeeSchema } from '../types'

export type AudiusTokenConfig = AudiusTokenConfigInternal & {
  audiusWalletClient: AudiusWalletClient
  ethPublicClient: PublicClient<Transport, typeof mainnet>
  ethWalletClient: WalletClient<Transport, typeof mainnet>
}

export type AudiusTokenConfigInternal = {
  address: Hex
}

export const BalanceOfSchema = z.object({
  account: EthAddressSchema
})

export type BalanceOfParams = z.input<typeof BalanceOfSchema>

export const PermitSchema = GasFeeSchema.and(
  z.object({
    args: z.object({
      owner: EthAddressSchema.optional(),
      spender: EthAddressSchema,
      value: z.bigint(),
      deadline: z.bigint().optional()
    }),
    account: z.custom<Account>().optional()
  })
)

export type PermitParams = z.input<typeof PermitSchema>
