import { toChainId, chains } from '@wormhole-foundation/sdk-base'
import {
  type Account,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient
} from 'viem'
import type { mainnet } from 'viem/chains'
import { z } from 'zod'

import { EthAddressSchema } from '../../../../types/EthAddress'
import { HexSchema } from '../../../../types/Hex'
import type { AudiusWalletClient } from '../../../AudiusWalletClient'
import { GasFeeSchema } from '../types'

export type AudiusWormholeConfig = AudiusWormholeConfigInternal & {
  audiusWalletClient: AudiusWalletClient
  ethPublicClient: PublicClient<Transport, typeof mainnet>
  ethWalletClient: WalletClient<Transport, typeof mainnet>
}

export type AudiusWormholeConfigInternal = {
  address: Hex
}

export const TransferTokensSchema = GasFeeSchema.and(
  z.object({
    args: z.object({
      from: EthAddressSchema.optional(),
      amount: z.bigint(),
      recipientChain: z.enum(chains).transform(toChainId),
      recipient: HexSchema,
      deadline: z.bigint().optional(),
      arbiterFee: z.bigint().optional()
    }),
    account: z.custom<Account>().optional()
  })
)

export type TransferTokensParams = z.input<typeof TransferTokensSchema>
