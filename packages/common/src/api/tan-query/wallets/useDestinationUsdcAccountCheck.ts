import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

import { SolanaWalletAddress } from '~/models/Wallet'
import { getJupiterQuoteByMintWithRetry } from '~/services/Jupiter'
import { SOL_MINT, TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'
import { isValidSolAddress } from '~/store/wallet/utils'

import { QUERY_KEYS } from '../queryKeys'
import type { QueryKey, QueryOptions } from '../types'
import { useQueryContext } from '../utils'

/** Result of checking whether a destination wallet has a USDC token account */
export type DestinationUsdcAccountStatus =
  | { hasUsdcAccount: true }
  | { hasUsdcAccount: false; ataCreationFeeUsdc: number }

const USDC_DECIMALS = TOKEN_LISTING_MAP.USDC.decimals
const SOL_DECIMALS = TOKEN_LISTING_MAP.SOL.decimals
const TOKEN_ACCOUNT_SIZE = 165
const ATA_TX_FEE_BUFFER_LAMPORTS = 10_000

export const getDestinationUsdcAccountQueryKey = (
  destinationAddress: string | null | undefined
) =>
  [
    QUERY_KEYS.destinationUsdcAccount,
    destinationAddress
  ] as unknown as QueryKey<DestinationUsdcAccountStatus>

/**
 * Checks whether a destination Solana address has a USDC token account.
 * When it doesn't, returns the estimated one-time fee to create it.
 * Use when the user pastes a destination address during USDC withdrawal (wallet route).
 */
export const useDestinationUsdcAccountCheck = (
  destinationAddress: string | null | undefined,
  options?: QueryOptions<DestinationUsdcAccountStatus>
) => {
  const { audiusSdk, env } = useQueryContext()
  const isValidAddress =
    !!destinationAddress &&
    isValidSolAddress(destinationAddress as SolanaWalletAddress)

  return useQuery<DestinationUsdcAccountStatus>({
    queryKey: getDestinationUsdcAccountQueryKey(destinationAddress),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const connection = sdk.services.solanaClient.connection
      const mint = new PublicKey(env.USDC_MINT_ADDRESS)
      const destinationWallet = new PublicKey(destinationAddress!)

      const destinationAta = getAssociatedTokenAddressSync(
        mint,
        destinationWallet,
        true
      )

      const info = await connection.getAccountInfo(destinationAta)
      if (info) return { hasUsdcAccount: true }

      const rentExemptLamports =
        await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE)
      const totalSolNeededLamports =
        rentExemptLamports + ATA_TX_FEE_BUFFER_LAMPORTS
      const totalSolNeededUi = totalSolNeededLamports / 1e9

      const { quoteResult: exactOutQuote } =
        await getJupiterQuoteByMintWithRetry({
          inputMint: mint.toBase58(),
          outputMint: SOL_MINT,
          inputDecimals: USDC_DECIMALS,
          outputDecimals: SOL_DECIMALS,
          amountUi: totalSolNeededUi,
          swapMode: 'ExactOut',
          onlyDirectRoutes: false
        })

      const estimatedFeeUsdc = BigInt(exactOutQuote.inputAmount.amountString)
      const feeWithBuffer =
        estimatedFeeUsdc + (estimatedFeeUsdc * BigInt(2)) / BigInt(100)
      const ataCreationFeeUsdc = Number(feeWithBuffer) / 10 ** USDC_DECIMALS

      return { hasUsdcAccount: false, ataCreationFeeUsdc }
    },
    enabled: isValidAddress && options?.enabled !== false,
    staleTime: 60_000,
    ...options
  })
}
