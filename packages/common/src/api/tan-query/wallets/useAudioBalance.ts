import { AUDIO, AudioWei, wAUDIO } from '@audius/fixed-decimal'
import {
  QueryClient,
  queryOptions,
  useQueries,
  useQuery,
  type QueryFunctionContext,
  useQueryClient
} from '@tanstack/react-query'
import { call, getContext } from 'typed-redux-saga'

import {
  getQueryContext,
  useQueryContext,
  type QueryContextType
} from '~/api/tan-query/utils/QueryContext'
import { Chain, ID } from '~/models'
import { toErrorWithMessage } from '~/utils/error'

import { QUERY_KEYS } from '../queryKeys'
import { queryCurrentUserId, queryUser } from '../saga-utils'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'

import { getConnectedWalletsQueryOptions } from './useAssociatedWallets'

type UseWalletAudioBalanceParams = {
  address: string
  chain: Chain
  includeStaked?: boolean
}

export const getWalletAudioBalanceQueryKey = ({
  address,
  includeStaked,
  chain
}: UseWalletAudioBalanceParams) =>
  [QUERY_KEYS.audioBalance, chain, address, { includeStaked }] as const

type FetchAudioBalanceContext = Pick<
  QueryContextType,
  'audiusSdk' | 'audiusBackend'
>

const getWalletAudioBalanceQueryFn =
  (context: FetchAudioBalanceContext) =>
  async ({
    queryKey
  }: QueryFunctionContext<
    ReturnType<typeof getWalletAudioBalanceQueryKey>
  >) => {
    const [_ignored, chain, address, { includeStaked }] = queryKey
    const { audiusSdk, audiusBackend } = context
    try {
      const sdk = await audiusSdk()
      if (chain === Chain.Eth) {
        const { getAddress } = await import('viem')
        const checksumWallet = getAddress(address)
        const ethereum = sdk.services.ethereum
        const balance = await ethereum.audiusToken.read.balanceOf([
          checksumWallet
        ])
        if (!includeStaked) {
          return AUDIO(balance).value
        }
        const [stakedBalance, delegatedBalance] = await Promise.all([
          ethereum.staking.read.totalStakedFor([checksumWallet]),
          ethereum.delegateManager.read.getTotalDelegatorStake([checksumWallet])
        ])
        const fullBalance = balance + stakedBalance + delegatedBalance
        return AUDIO(fullBalance).value
      } else {
        const wAudioSolBalance = await audiusBackend.getAddressWAudioBalance({
          address,
          sdk
        })

        return AUDIO(wAUDIO(BigInt(wAudioSolBalance.toString()))).value
      }
    } catch (error) {
      console.error('AudioBalanceFetchError', toErrorWithMessage(error))
      throw error
    }
  }

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

type UseAudioBalanceParams = {
  includeConnectedWallets?: boolean
  includeStaked?: boolean
  userId?: ID
}

export type UseAudioBalanceOptions = Omit<
  Partial<ReturnType<typeof getWalletAudioBalanceOptions>>,
  'queryKey' | 'queryFn'
>

export const useAudioBalance = (
  params: UseAudioBalanceParams = {},
  options?: UseAudioBalanceOptions
) => {
  const {
    includeConnectedWallets: includeConnectedWalletsParam = true,
    includeStaked = false,
    userId: userIdParam
  } = params

  const { data: currentUserId } = useCurrentUserId()
  const userId = userIdParam ?? currentUserId
  const includeConnectedWallets =
    includeConnectedWalletsParam && userId === currentUserId
  const { data, isSuccess: isUserFetched } = useUser(userId)
  const accountBalances = useWalletAudioBalances(
    {
      wallets: [
        ...(data?.erc_wallet
          ? [{ address: data.erc_wallet, chain: Chain.Eth }]
          : []),
        ...(data?.spl_wallet
          ? [{ address: data.spl_wallet, chain: Chain.Sol }]
          : [])
      ],
      includeStaked
    },
    {
      ...options,
      enabled: options?.enabled !== false && isUserFetched
    }
  )
  let accountBalance = AUDIO(0).value

  for (const balanceRes of accountBalances.data) {
    accountBalance = AUDIO(
      accountBalance + (balanceRes.balance ?? AUDIO(0).value)
    ).value
  }

  const context = useQueryContext()
  const shouldFetchConnectedWallets =
    includeConnectedWallets && !!currentUserId && options?.enabled !== false
  const connectedWalletsQuery = useQuery({
    ...getConnectedWalletsQueryOptions(context, { userId: currentUserId }),
    enabled: shouldFetchConnectedWallets
  })
  const {
    data: connectedWallets = [],
    isFetched: isConnectedWalletsFetched,
    isError: isConnectedWalletsError
  } = connectedWalletsQuery
  const connectedWalletsBalances = useWalletAudioBalances(
    {
      wallets: connectedWallets,
      includeStaked
    },
    {
      ...options,
      enabled:
        shouldFetchConnectedWallets &&
        isConnectedWalletsFetched &&
        options?.enabled !== false
    }
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

function* getWalletBalances(wallets: Array<{ address: string; chain: Chain }>) {
  const queryClient = yield* getContext<QueryClient>('queryClient')
  const queryContext = yield* getQueryContext()
  let totalBalance: AudioWei = AUDIO(0).value
  for (const wallet of wallets) {
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

export const updateAudioBalanceOptimistically = ({
  queryClient,
  splWallet,
  changeLamports
}: {
  queryClient: QueryClient
  splWallet: string
  changeLamports: bigint
}): void => {
  const changeAudioWei = AUDIO(wAUDIO(changeLamports)).value

  for (const includeStaked of [false, true]) {
    const queryKey = getWalletAudioBalanceQueryKey({
      address: splWallet,
      chain: Chain.Sol,
      includeStaked
    })

    queryClient.setQueryData<AudioWei>(queryKey, (oldBalance) => {
      if (oldBalance === undefined) return oldBalance

      const currentBalance = oldBalance ?? AUDIO(0).value
      const newBalance = AUDIO(currentBalance + changeAudioWei).value

      return newBalance >= 0 ? newBalance : AUDIO(0).value
    })
  }
}

export const invalidateAudioBalance = ({
  queryClient,
  splWallet
}: {
  queryClient: QueryClient
  splWallet: string
}) => {
  const queryKey = getWalletAudioBalanceQueryKey({
    address: splWallet,
    chain: Chain.Sol
  })
  queryClient.invalidateQueries({ queryKey })
}

export const pollUntilAudioBalanceChanges = async (
  queryClient: ReturnType<typeof useQueryClient>,
  splWallet: string,
  maxAttempts = 10,
  delayMs = 300
): Promise<void> => {
  const queryKey = getWalletAudioBalanceQueryKey({
    address: splWallet,
    chain: Chain.Sol,
    includeStaked: false
  })
  const originalBalance = queryClient.getQueryData<AudioWei>(queryKey)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    await queryClient.invalidateQueries({ queryKey })
    await queryClient.refetchQueries({ queryKey })

    const newBalance = queryClient.getQueryData<AudioWei>(queryKey)
    if (newBalance !== originalBalance) {
      return
    }
  }

  console.warn(
    `Audio balance polled viia pollUntilAudioBalanceChanges but the value was not changed after ${maxAttempts} attempts`
  )
}
