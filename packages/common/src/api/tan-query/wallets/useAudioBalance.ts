import { AUDIO, AudioWei, wAUDIO } from '@audius/fixed-decimal'
import {
  QueryClient,
  queryOptions,
  useQueries,
  useQuery,
  type QueryFunctionContext
} from '@tanstack/react-query'
import { call, getContext } from 'typed-redux-saga'
import { getAddress } from 'viem'

import {
  getQueryContext,
  useQueryContext,
  type QueryContextType
} from '~/api/tan-query/utils/QueryContext'
import { Chain } from '~/models'
import { Feature } from '~/models/ErrorReporting'
import { toErrorWithMessage } from '~/utils/error'

import { QUERY_KEYS } from '../queryKeys'
import { queryCurrentUserId, queryUser } from '../saga-utils'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'

import {
  getConnectedWalletsQueryOptions,
  useConnectedWallets
} from './useConnectedWallets'

type UseWalletAudioBalanceParams = {
  /** Ethereum or Solana wallet address */
  address: string
  chain: Chain
  /** Include staked and delegated staked in the balance total */
  includeStaked?: boolean
}

const getWalletAudioBalanceQueryKey = ({
  address,
  includeStaked,
  chain
}: UseWalletAudioBalanceParams) =>
  [QUERY_KEYS.audioBalance, chain, address, { includeStaked }] as const

type FetchAudioBalanceContext = Pick<
  QueryContextType,
  'audiusSdk' | 'audiusBackend' | 'reportToSentry'
>

const getWalletAudioBalanceQueryFn =
  (context: FetchAudioBalanceContext) =>
  async ({
    queryKey
  }: QueryFunctionContext<
    ReturnType<typeof getWalletAudioBalanceQueryKey>
  >) => {
    const [_ignored, chain, address, { includeStaked }] = queryKey
    const { audiusSdk, audiusBackend, reportToSentry } = context
    try {
      const sdk = await audiusSdk()
      if (chain === Chain.Eth) {
        const checksumWallet = getAddress(address)
        const balance = await sdk.services.audiusTokenClient.balanceOf({
          account: checksumWallet
        })
        if (!includeStaked) {
          return AUDIO(balance).value
        }
        const delegatedBalance =
          await sdk.services.delegateManagerClient.getTotalDelegatorStake({
            delegatorAddress: checksumWallet
          })
        const stakedBalance = await sdk.services.stakingClient.totalStakedFor({
          account: checksumWallet
        })

        return AUDIO(balance + delegatedBalance + stakedBalance).value
      } else {
        const wAudioSolBalance = await audiusBackend.getAddressWAudioBalance({
          address,
          sdk
        })

        return AUDIO(wAUDIO(BigInt(wAudioSolBalance.toString()))).value
      }
    } catch (error) {
      reportToSentry({
        error: toErrorWithMessage(error),
        name: 'AudioBalanceFetchError',
        feature: Feature.TanQuery,
        additionalInfo: { address, chain }
      })
      throw error
    }
  }

/**
 * Helper function to get the query options for fetching the AUDIO balance of a wallet.
 * Useful for getting the query key tagged with the data type stored in the cache.
 */
const getWalletAudioBalanceOptions = (
  context: FetchAudioBalanceContext,
  { address, includeStaked, chain }: UseWalletAudioBalanceParams
) => {
  return queryOptions({
    queryKey: getWalletAudioBalanceQueryKey({
      address,
      includeStaked,
      chain
    }),
    queryFn: getWalletAudioBalanceQueryFn(context)
  })
}

/**
 * Query function for getting the AUDIO balance of an Ethereum or Solana wallet.
 */
export const useWalletAudioBalance = (
  params: UseWalletAudioBalanceParams,
  options?: Partial<ReturnType<typeof getWalletAudioBalanceOptions>>
) => {
  const context = useQueryContext()
  return useQuery({
    ...options,
    ...getWalletAudioBalanceOptions(context, params)
  })
}

type UseAudioBalancesParams = {
  wallets: Array<{ address: string; chain: Chain }>
  includeStaked?: boolean
}

/**
 * Query function for getting the AUDIO balance of several Ethereum or Solana wallets.
 */
export const useWalletAudioBalances = (
  params: UseAudioBalancesParams,
  options?: Partial<ReturnType<typeof getWalletAudioBalanceOptions>>
) => {
  const context = useQueryContext()
  const queries = params.wallets.map(({ address, chain }) => ({
    ...options,
    ...getWalletAudioBalanceOptions(context, {
      address,
      chain,
      includeStaked: params.includeStaked
    })
  }))
  return useQueries({
    queries,
    combine: (results) => {
      return {
        data: results.map((r, i) => ({
          balance: r.data,
          chain: params.wallets[i].chain,
          address: params.wallets[i].address
        })),
        isPending: results.some((r) => r.isPending),
        isError: results.some((r) => r.isError),
        isSuccess: results.every((r) => r.isSuccess)
      }
    }
  })
}

type UseAudioBalanceOptions = {
  /** Whether to include connected/linked wallets in the balance calculation. Defaults to true. */
  includeConnectedWallets?: boolean
}

/**
 * Hook for getting the AUDIO balance of the current user, optionally including connected wallets.
 */
export const useAudioBalance = (options: UseAudioBalanceOptions = {}) => {
  const { includeConnectedWallets = true } = options

  // Get account balances
  const { data: currentUserId } = useCurrentUserId()
  const { data, isSuccess: isUserFetched } = useUser(currentUserId)
  const accountBalances = useWalletAudioBalances(
    {
      wallets: [
        // Include their Hedgehog/auth account wallet
        ...(data?.erc_wallet
          ? [{ address: data.erc_wallet, chain: Chain.Eth }]
          : []),
        // Include their user bank account
        ...(data?.spl_wallet
          ? [{ address: data.spl_wallet, chain: Chain.Sol }]
          : [])
      ]
    },
    { enabled: isUserFetched }
  )
  let accountBalance = AUDIO(0).value

  for (const balanceRes of accountBalances.data) {
    accountBalance = AUDIO(
      accountBalance + (balanceRes.balance ?? AUDIO(0).value)
    ).value
  }

  // Get linked/connected wallets balances
  const {
    data: connectedWallets = [],
    isFetched: isConnectedWalletsFetched,
    isError: isConnectedWalletsError
  } = useConnectedWallets()
  const connectedWalletsBalances = useWalletAudioBalances(
    {
      wallets: connectedWallets
    },
    { enabled: isConnectedWalletsFetched && includeConnectedWallets }
  )
  let connectedWalletsBalance = AUDIO(0).value
  const isConnectedWalletsBalanceLoading = includeConnectedWallets
    ? connectedWalletsBalances.isPending
    : false
  if (includeConnectedWallets) {
    for (const balanceRes of connectedWalletsBalances.data) {
      connectedWalletsBalance = AUDIO(
        connectedWalletsBalance + (balanceRes.balance ?? AUDIO(0).value)
      ).value
    }
  }

  // Together they are the total balance
  const totalBalance = AUDIO(accountBalance + connectedWalletsBalance).value
  const isLoading =
    accountBalances.isPending || isConnectedWalletsBalanceLoading
  const isError =
    isConnectedWalletsError ||
    accountBalances.isError ||
    connectedWalletsBalances.isError
  return {
    accountBalance,
    connectedWalletsBalance,
    totalBalance,
    isLoading,
    isError
  }
}

// Helper fn for the saga selectors below
function* getWalletBalances(wallets: Array<{ address: string; chain: Chain }>) {
  const queryClient = yield* getContext<QueryClient>('queryClient')
  const queryContext = yield* getQueryContext()
  let totalBalance: AudioWei = AUDIO(0).value
  for (const wallet of wallets) {
    // For some reason, type check fails when doing
    // yield* call([queryClient, queryClient.fetchQuery], {...}) directly,
    // so wrap this in an async function and call that instead.
    const fetchWalletBalance = async () =>
      await queryClient.fetchQuery(
        getWalletAudioBalanceOptions(queryContext, {
          address: wallet.address,
          chain: wallet.chain,
          includeStaked: true
        })
      )
    const balance = yield* call(fetchWalletBalance)
    totalBalance = AUDIO(totalBalance + (balance ?? AUDIO(0).value)).value
  }
  return totalBalance
}

export function* getAccountAudioBalanceSaga() {
  const currentUserId = yield* call(queryCurrentUserId)
  const user = yield* call(queryUser, currentUserId)
  const userWallets = [
    ...(user?.erc_wallet
      ? [{ address: user.erc_wallet, chain: Chain.Eth }]
      : []),
    ...(user?.spl_wallet
      ? [{ address: user.spl_wallet, chain: Chain.Sol }]
      : [])
  ]
  return yield* call(getWalletBalances, userWallets)
}

/**
 * Sums current audio account balance combined with balance from all connected wallets
 * @returns
 */
export function* getAccountTotalAudioBalanceSaga() {
  const queryClient = yield* getContext<QueryClient>('queryClient')
  const queryContext = yield* getQueryContext()
  const accountBalance = yield* call(getAccountAudioBalanceSaga)
  const currentUserId = yield* call(queryCurrentUserId)
  const fetchConnectedWallets = async () =>
    await queryClient.fetchQuery(
      getConnectedWalletsQueryOptions(queryContext, {
        userId: currentUserId
      })
    )
  const connectedWallets = yield* call(fetchConnectedWallets)
  const connectedWalletsBalance = yield* call(
    getWalletBalances,
    connectedWallets ?? []
  )

  return AUDIO(accountBalance + connectedWalletsBalance).value
}

/**
 * Optimistically updates the user's SOL wallet balance in the cache.
 * Use this to provide immediate UI feedback before the transaction confirms.
 *
 * @param amount - The amount to add (positive) or subtract (negative) from the current balance
 */
export function* optimisticallyUpdateUserWAudioBalance(change: AudioWei) {
  const queryClient = yield* getContext<QueryClient>('queryClient')
  const queryContext = yield* getQueryContext()
  const currentUserId = yield* call(queryCurrentUserId)
  const user = yield* call(queryUser, currentUserId)

  if (!user?.spl_wallet) return

  // Update both staked and non-staked balance queries for the SOL wallet
  for (const includeStaked of [true, false]) {
    const { queryKey } = getWalletAudioBalanceOptions(queryContext, {
      address: user.spl_wallet,
      chain: Chain.Sol,
      includeStaked
    })

    queryClient.setQueryData(queryKey, (oldBalance) => {
      const currentBalance = oldBalance ?? AUDIO(0).value
      const newBalance = AUDIO(currentBalance + change).value
      // Ensure balance doesn't go negative
      return newBalance >= 0 ? newBalance : AUDIO(0).value
    })
  }
}

/**
 * Reverts an optimistic balance update by invalidating the cache.
 * Use this when a transaction fails and you need to revert to the real balance.
 */
export function* revertOptimisticUserSolBalance() {
  const queryClient = yield* getContext<QueryClient>('queryClient')
  const currentUserId = yield* call(queryCurrentUserId)
  const user = yield* call(queryUser, currentUserId)

  if (!user?.spl_wallet) return

  // Invalidate both staked and non-staked balance queries
  const solWalletQueries = [
    {
      address: user.spl_wallet,
      chain: Chain.Sol,
      includeStaked: true
    },
    {
      address: user.spl_wallet,
      chain: Chain.Sol,
      includeStaked: false
    }
  ]

  for (const queryParams of solWalletQueries) {
    const queryKey = getWalletAudioBalanceQueryKey(queryParams)
    queryClient.invalidateQueries({ queryKey })
  }
}
