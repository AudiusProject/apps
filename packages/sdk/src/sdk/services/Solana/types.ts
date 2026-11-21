import type { WalletAdapterProps } from '@solana/wallet-adapter-base'
import type {
  PublicKey,
  VersionedTransaction,
  SendOptions,
  Transaction
} from '@solana/web3.js'
import { z } from 'zod'

import type { Prettify } from '../../utils/prettify'

import type { SolanaRelay } from './SolanaRelay'

export type SolanaWalletAdapter = WalletAdapterProps

export type SolanaConfig = {}

export type SolanaRelayService = SolanaRelay

/**
 * A PublicKey, or a string that is parsed into one.
 *
 * Loads @solana/web3.js when parsing, so it only supports async parsing
 * (`parseAsync`/`safeParseAsync`).
 */
export const PublicKeySchema = z.union([
  z.string().transform<PublicKey>(async (data, ctx) => {
    const { PublicKey } = await import('@solana/web3.js')
    try {
      return new PublicKey(data)
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: e instanceof Error ? e.message : 'Invalid PublicKey input'
      })
    }
    return z.NEVER
  }),
  z.custom<PublicKey>().refine(async (data) => {
    const { PublicKey } = await import('@solana/web3.js')
    return data instanceof PublicKey
  })
])

export const TokenNameSchema = z.enum(['wAUDIO', 'USDC'])

export type TokenName = z.input<typeof TokenNameSchema>

export const MintSchema = z.union([TokenNameSchema, PublicKeySchema])

export type Mint = z.input<typeof MintSchema>

export const RelaySchema = z
  .object({
    transaction: z.custom<VersionedTransaction | Transaction>(),
    /**
     * Confirmation options used when sending the transaction on the server.
     * @see {@link https://solana-labs.github.io/solana-web3.js/classes/Connection.html#confirmTransaction confirmTransaction}
     */
    confirmationOptions: z
      .object({
        /**
         * The confirmation strategy to use when confirming.
         * @see {@link https://solana-labs.github.io/solana-web3.js/types/TransactionConfirmationStrategy.html ConfirmationStrategy}
         * @see {@link https://solana-labs.github.io/solana-web3.js/types/DurableNonceTransactionConfirmationStrategy.html DurableNonceTransactionConfirmationStrategy}
         * @see {@link https://solana-labs.github.io/solana-web3.js/types/BlockheightBasedTransactionConfirmationStrategy.html BlockhashBasedTransactionConfirmationStrategy}
         */
        strategy: z
          .union([
            z.object({
              blockhash: z.string(),
              lastValidBlockHeight: z.number()
            }),
            z.object({
              minContextSlot: z.number(),
              nonceAccountPubkey: PublicKeySchema,
              nonceValue: z.string()
            })
          ])
          .optional(),
        /**
         * The commitment the server should confirm before responding.
         * Leave unset to have the server respond immediately after sending.
         * @see {@link https://solana-labs.github.io/solana-web3.js/types/Commitment.html Commitment}
         */
        commitment: z
          .enum([
            'processed',
            'confirmed',
            'finalized',
            'recent',
            'single',
            'singleGossip',
            'root',
            'max'
          ])
          .optional()
      })
      .optional(),
    /**
     * Custom send options used when sending the transaction on the relay.
     * @see {@link https://solana-labs.github.io/solana-web3.js/types/SendOptions.html SendOptions}
     */
    sendOptions: z.custom<SendOptions>().optional()
  })
  .strict()

export type RelayRequest = z.infer<typeof RelaySchema>
export type RelayRequestBody = Prettify<
  Omit<RelayRequest, 'transaction'> & {
    /**
     * Base64 encoded serialized VersionedTransaction object.
     */
    transaction: string
  }
>

export const LaunchCoinSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    symbol: z.string().min(1, 'Symbol is required'),
    description: z.string().min(1, 'Description is required'),
    walletPublicKey: PublicKeySchema,
    initialBuyAmountAudio: z.string().optional(),
    image: z.custom<Blob>((data) => {
      return data instanceof Blob
    }, 'Image file is required')
  })
  .strict()

export type LaunchCoinRequest = z.infer<typeof LaunchCoinSchema>

export type LaunchCoinResponse = {
  mintPublicKey: string
  configPublicKey: string
  createPoolTx: string
  firstBuyTx: string | undefined
  metadataUri: string
  imageUri: string
}

export type FirstBuyQuoteResponse = {
  usdcValue: string
  tokenOutputAmount: string
  audioInputAmount: string
  maxAudioInputAmount: string
  maxTokenOutputAmount: string
}

export type FirstBuyQuoteRequest =
  | {
      audioInputAmount: string
    }
  | {
      tokenOutputAmount: string
    }

export type LaunchpadConfigResponse = {
  maxAudioInputAmount: string
  maxTokenOutputAmount: string
  startingPrice: string
}

export type ClaimFeesRequest = {
  tokenMint: string
  ownerWalletAddress: string
  receiverWalletAddress: string
}

export type ClaimFeesResponse = {
  claimFeeTxs: Array<string>
}

export type ClaimVestedCoinsRequest = {
  tokenMint: string
  ownerWalletAddress: string
  receiverWalletAddress: string
  rewardsPoolPercentage: number
}

export type ClaimVestedCoinsResponse = {
  claimVestedCoinsTxs: Array<string>
  availableAmount: string
  totalAmount?: string
  claimedAmount?: string
  remainingLocked?: string
  userClaimedAmount?: string
  rewardsPoolClaimedAmount?: string
}

export type SwapCoinQuoteRequest = {
  inputAmount: string
  coinMint: string
  swapDirection: 'audioToCoin' | 'coinToAudio'
}

export type SwapCoinQuoteResponse = {
  outputAmount: string
}

export type SwapCoinRequest = {
  inputAmount: string
  coinMint: string
  swapDirection: 'audioToCoin' | 'coinToAudio'
  userPublicKey: PublicKey
  isExternalWallet?: boolean
  feePayer?: PublicKey
}

export type SwapCoinResponse = {
  transaction: string
  outputAmount: string
  includedFeeInputAmount?: string
}
