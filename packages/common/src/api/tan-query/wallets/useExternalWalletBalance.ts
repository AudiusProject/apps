import { FixedDecimal } from '@audius/fixed-decimal'
import {
  queryOptions,
  useQuery,
  type QueryFunctionContext
} from '@tanstack/react-query'

import {
  useQueryContext,
  type QueryContextType
} from '~/api/tan-query/utils/QueryContext'
import { Feature } from '~/models/ErrorReporting'
import { TOKEN_LISTING_MAP } from '~/store'
import { toErrorWithMessage } from '~/utils/error'

import { QUERY_KEYS } from '../queryKeys'
import { QueryOptions } from '../types'

type TokenAccount = {
  account: string
  amount: string
  uiAmount: number
  uiAmountString: string
  isFrozen: boolean
  isAssociatedTokenAccount: boolean
  decimals: number
  programId: string
  excludeFromNetWorth: boolean
}

type ExternalWalletBalanceResponse = {
  amount: string
  uiAmount: number
  uiAmountString: string
  tokens: Record<string, TokenAccount[]>
}

type UseExternalWalletBalanceParams = {
  walletAddress: string
  mint: string
}

export const getExternalWalletBalanceQueryKey = ({
  walletAddress,
  mint
}: Partial<UseExternalWalletBalanceParams>) =>
  [QUERY_KEYS.externalWalletBalance, { walletAddress, mint }] as const

type FetchExternalWalletBalanceContext = Pick<
  QueryContextType,
  'audiusSdk' | 'env' | 'reportToSentry'
>

const getExternalWalletBalanceQueryFn =
  (context: FetchExternalWalletBalanceContext) =>
  async ({
    queryKey
  }: QueryFunctionContext<
    ReturnType<typeof getExternalWalletBalanceQueryKey>
  >) => {
    const [_ignored, { walletAddress, mint }] = queryKey
    if (!walletAddress || !mint) {
      throw new Error('Wallet address and mint are required')
    }
    const { reportToSentry } = context
    try {
      // Call Jupiter API to get balances
      const response = await fetch(
        `https://lite-api.jup.ag/ultra/v1/holdings/${walletAddress}`
      )

      if (!response.ok) {
        throw new Error(
          `Jupiter API error: ${response.status} ${response.statusText}`
        )
      }

      const balances: ExternalWalletBalanceResponse = await response.json()

      // Solana balance is at the top of the balances, no need to drill into the token accounts
      if (mint === TOKEN_LISTING_MAP.SOL.address) {
        return new FixedDecimal(
          balances.uiAmount,
          TOKEN_LISTING_MAP.SOL.decimals
        )
      }
      // Find the balance for the specific mint
      const tokenBalance = mint ? balances?.tokens?.[mint]?.[0] : undefined

      if (!tokenBalance) {
        return new FixedDecimal(0)
      }

      // Convert raw balance to FixedDecimal with proper decimals
      return new FixedDecimal(tokenBalance.uiAmount, tokenBalance.decimals)
    } catch (error) {
      reportToSentry({
        error: toErrorWithMessage(error),
        name: 'ExternalWalletBalanceFetchError',
        feature: Feature.TanQuery,
        additionalInfo: { walletAddress, mint }
      })
      throw error
    }
  }

export const getExternalWalletBalanceOptions = (
  context: FetchExternalWalletBalanceContext,
  { walletAddress, mint }: Partial<UseExternalWalletBalanceParams>
) => {
  return queryOptions({
    queryKey: getExternalWalletBalanceQueryKey({
      walletAddress: walletAddress!,
      mint: mint!
    }),
    queryFn: getExternalWalletBalanceQueryFn(context)
  })
}

export const useExternalWalletBalance = (
  {
    walletAddress,
    mint
  }: { walletAddress: string | undefined; mint: string | undefined },
  options?: QueryOptions
) => {
  const context = useQueryContext()

  return useQuery({
    ...options,
    ...getExternalWalletBalanceOptions(
      { ...context },
      {
        walletAddress,
        mint
      }
    ),
    enabled: options?.enabled !== false && !!walletAddress && !!mint
  })
}
