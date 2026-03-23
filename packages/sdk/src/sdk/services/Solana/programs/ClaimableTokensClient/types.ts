import type { PublicKey } from '@solana/web3.js'
import { z } from 'zod'

import type { Prettify } from '../../../../utils/prettify'
import type { AudiusWalletClient } from '../../../AudiusWalletClient'
import type { LoggerService } from '../../../Logger'
import { TokenName, MintSchema, PublicKeySchema } from '../../types'
import type { SolanaClient } from '../SolanaClient'

export type ClaimableTokensConfigInternal = {
  /** The program ID of the ClaimableTokensProgram instance. */
  programId: PublicKey
  /** Map from token mint name to public key address. */
  mints: Record<TokenName, PublicKey>
  logger: LoggerService
}

export type ClaimableTokensConfig = Prettify<
  Partial<Omit<ClaimableTokensConfigInternal, 'mints'>> & {
    audiusWalletClient: AudiusWalletClient
    solanaClient: SolanaClient
    mints?: Prettify<Partial<Record<TokenName, PublicKey>>>
  }
>

export const GetOrCreateUserBankSchema = z
  .object({
    /** The user's Ethereum wallet. */
    ethWallet: z.string().optional(),
    /** The name of the token mint. */
    mint: MintSchema,
    /**
     * The public key of the account that will be paying the
     * account creation and transaction fees.
     */
    feePayer: PublicKeySchema.optional()
  })
  .strict()

export type GetOrCreateUserBankRequest = z.infer<
  typeof GetOrCreateUserBankSchema
>

export const DeriveUserBankSchema = z
  .object({
    /** The sending user's Ethereum wallet. Defaults to the current audiusWalletClient address. */
    ethWallet: z.string().optional(),
    /** The name of the token mint. */
    mint: MintSchema
  })
  .strict()

export type DeriveUserBankRequest = z.infer<typeof DeriveUserBankSchema>

export const CreateTransferSchema = z.object({
  /** The public key of the account that will be paying the transaction fees. */
  feePayer: PublicKeySchema.optional(),
  /** The sending user's Ethereum wallet. Defaults to the current audiusWalletClient address. */
  ethWallet: z.string().optional(),
  /** The name of the token mint. */
  mint: MintSchema,
  /** The public key of the destination account. */
  destination: PublicKeySchema
})

export type CreateTransferRequest = z.infer<typeof CreateTransferSchema>

export const CreateSecpSchema = z
  .object({
    /** The sending user's Ethereum wallet. Defaults to the current audiusWalletClient address. */
    ethWallet: z.string().optional(),
    /** The public key of the destination account. */
    destination: PublicKeySchema,
    /** The amount to send, in "lamports"/"wei" (bigint). */
    amount: z.bigint(),
    /** The name of the token mint. */
    mint: MintSchema,
    /** The index of this instruction within the transaction. */
    instructionIndex: z.number().optional(),
    /** Optional nonce override. When provided, skips the on-chain nonce lookup.
     *  Useful when the caller knows the current nonce (e.g. after a prior transfer
     *  that incremented it) and wants to avoid stale RPC reads. */
    nonce: z.bigint().optional()
  })
  .strict()

export type CreateSecpRequest = z.infer<typeof CreateSecpSchema>
