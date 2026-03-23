import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

import { getJupiterQuoteByMintWithRetry } from '~/services/Jupiter'
import { SOL_MINT, TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'

import { QUERY_KEYS } from '../queryKeys'
import type { QueryKey, QueryOptions } from '../types'
import { useQueryContext } from '../utils'

import type { DestinationUsdcAccountStatus } from './useDestinationUsdcAccountCheck'

const USDC_DECIMALS = TOKEN_LISTING_MAP.USDC.decimals
const SOL_DECIMALS = TOKEN_LISTING_MAP.SOL.decimals
const TOKEN_ACCOUNT_SIZE = 165
const ATA_TX_FEE_BUFFER_LAMPORTS = 10_000

export const getRootWalletUsdcAccountQueryKey = () =>
  [
    QUERY_KEYS.rootWalletUsdcAccount
  ] as unknown as QueryKey<DestinationUsdcAccountStatus>

/**
 * Checks whether the user's root Solana wallet has a USDC token account.
 * When it doesn't, returns the estimated one-time fee to create it.
 * Used in the Coinflow withdraw-to-bank flow to show a setup fee.
 */
export const useRootWalletUsdcAccountCheck = (
  options?: QueryOptions<DestinationUsdcAccountStatus>
) => {
  const { audiusSdk, solanaWalletService } = useQueryContext()

  return useQuery<DestinationUsdcAccountStatus>({
    queryKey: getRootWalletUsdcAccountQueryKey(),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const connection = sdk.services.solanaClient.connection

      const keypair = await solanaWalletService.getKeypair()
      if (!keypair) {
        throw new Error('Missing root Solana wallet')
      }

      const mint = new PublicKey(
        TOKEN_LISTING_MAP.USDC.address
      )
      const rootUsdcAta = getAssociatedTokenAddressSync(
        mint,
        keypair.publicKey,
        true
      )

      const info = await connection.getAccountInfo(rootUsdcAta)
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
    staleTime: 60_000,
    ...options
  })
}
