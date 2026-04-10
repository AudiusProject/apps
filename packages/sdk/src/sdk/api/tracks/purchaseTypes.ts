import type { WalletAdapter } from '@solana/wallet-adapter-base'
import { z } from 'zod'

import { PublicKeySchema } from '../../services/Solana'
import { HashId } from '../../types/HashId'

const PurchaseTrackSchemaBase = z.object({
  /** The ID of the user purchasing the track. */
  userId: HashId,
  /** The ID of the track to purchase. */
  trackId: HashId,
  /**
   * The price of the track at the time of purchase (in dollars if number, USDC if bigint).
   * Used to check against current track price in case it changed,
   * effectively setting a "max price" for the purchase.
   */
  price: z.union([z.number().min(0), z.bigint().min(BigInt(0))]),
  /** Any extra amount the user wants to donate (in dollars if number, USDC if bigint) */
  extraAmount: z
    .union([z.number().min(0), z.bigint().min(BigInt(0))])
    .optional(),
  /** Whether to include the staking system as a recipient */
  includeNetworkCut: z.boolean().optional()
})

export const GetPurchaseTrackInstructionsSchema = z
  .object({})
  .merge(PurchaseTrackSchemaBase)

export type GetPurchaseTrackInstructionsRequest = z.input<
  typeof GetPurchaseTrackInstructionsSchema
>

export const PurchaseTrackSchema = z
  .object({
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    walletAdapter: z
      .custom<Pick<WalletAdapter, 'publicKey' | 'sendTransaction'>>()
      .optional(),
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    wallet: PublicKeySchema.optional()
  })
  .merge(PurchaseTrackSchemaBase)
  .strict()

export type PurchaseTrackRequest = z.input<typeof PurchaseTrackSchema>
