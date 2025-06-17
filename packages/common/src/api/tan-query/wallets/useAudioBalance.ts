import { AUDIO, AudioWei, wAUDIO } from '@audius/fixed-decimal'
import type { AudiusSdk } from '@audius/sdk'
import { useQueries, useQuery } from '@tanstack/react-query'
import { getAddress } from 'viem'

import {
  useQueryContext,
  type QueryContextType
} from '~/api/tan-query/utils/QueryContext'
import { Chain } from '~/models'
import { Feature } from '~/models/ErrorReporting'
import { toErrorWithMessage } from '~/utils/error'

import { QUERY_KEYS } from '../queryKeys'
import { QueryOptions, type QueryKey } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'

import { useConnectedWallets } from './useConnectedWallets'

type UseWalletAudioBalanceParams = {
  /** Ethereum or Solana wallet address */
  address: string
  chain: Chain
  /** Include staked and delegated staked in the balance total */
  includeStaked?: boolean
}

export const getWalletAudioBalanceQueryKey = ({
  address,
  includeStaked,
  chain
}: UseWalletAudioBalanceParams) =>
  [
    QUERY_KEYS.audioBalance,
    chain,
    address,
    { includeStaked }
  ] as unknown as QueryKey<AudioWei>

const fetchWalletAudioBalance = async (
  {
    sdk,
    audiusBackend
  }: {
    sdk: AudiusSdk
    audiusBackend: QueryContextType['audiusBackend']
  },
  { address, includeStaked, chain }: UseWalletAudioBalanceParams
): Promise<AudioWei> => {
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
    try {
      const wAudioSolBalance = await audiusBackend.getAddressWAudioBalance({
        address,
        sdk
      })

      return AUDIO(wAUDIO(BigInt(wAudioSolBalance.toString()))).value
    } catch (error) {
      throw new Error(
        `Failed to fetch Solana AUDIO balance: ${toErrorWithMessage(error).message}`
      )
    }
  }
}

/**
 * Query function for getting the AUDIO balance of an Ethereum or Solana wallet.
 */
export const useWalletAudioBalance = (
  { address, includeStaked, chain }: UseWalletAudioBalanceParams,
  options?: QueryOptions
) => {
  const { audiusSdk, audiusBackend, reportToSentry } = useQueryContext()

  return useQuery({
    queryKey: getWalletAudioBalanceQueryKey({ address, includeStaked, chain }),
    queryFn: async () => {
      try {
        const sdk = await audiusSdk()
        return await fetchWalletAudioBalance(
          { sdk, audiusBackend },
          { address, includeStaked, chain }
        )
      } catch (error) {
        reportToSentry({
          error: toErrorWithMessage(error),
          name: 'AudioBalanceFetchError',
          feature: Feature.TanQuery,
          additionalInfo: { address, chain, includeStaked }
        })
        throw error
      }
    },
    ...options
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
  options?: QueryOptions
) => {
  const { audiusSdk, audiusBackend, reportToSentry } = useQueryContext()
  return useQueries({
    queries: params.wallets.map(({ address, chain }) => ({
      queryKey: getWalletAudioBalanceQueryKey({
        address,
        chain,
        includeStaked: true
      }),
      queryFn: async () => {
        try {
          const sdk = await audiusSdk()
          return await fetchWalletAudioBalance(
            { sdk, audiusBackend },
            {
              address,
              chain,
              includeStaked: true
            }
          )
        } catch (error) {
          reportToSentry({
            error: toErrorWithMessage(error),
            name: 'AudioBalancesFetchError',
            feature: Feature.TanQuery,
            additionalInfo: { address, chain }
          })
          throw error
        }
      },
      ...options
    }))
  })
}

type UseAudioBalanceOptions = {
  /** Whether to include connected/linked wallets in the balance calculation. Defaults to true. */
  includeConnectedWallets?: boolean
}

/**
 * Hook for getting the AUDIO balance of the current user, optionally including connected wallets.
 *
 * NOTE: Does not stay in sync with the store. Won't reflect optimism.
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
  const isAccountBalanceLoading = accountBalances.some(
    (balanceRes) => balanceRes.isPending
  )
  for (const balanceRes of accountBalances) {
    accountBalance += balanceRes?.data ?? AUDIO(0).value
  }

  // Get linked/connected wallets balances
  const { data: connectedWallets, isFetched: isConnectedWalletsFetched } =
    useConnectedWallets()
  const connectedWalletsBalances = useWalletAudioBalances(
    {
      wallets: connectedWallets ?? []
    },
    { enabled: isConnectedWalletsFetched && includeConnectedWallets }
  )
  let connectedWalletsBalance = AUDIO(0).value
  const isConnectedWalletsBalanceLoading = includeConnectedWallets
    ? connectedWalletsBalances.some((balanceRes) => balanceRes.isPending)
    : false
  if (includeConnectedWallets) {
    for (const balanceRes of connectedWalletsBalances) {
      connectedWalletsBalance += balanceRes?.data ?? AUDIO(0).value
    }
  }

  // Together they are the total balance
  const totalBalance = AUDIO(accountBalance + connectedWalletsBalance).value
  const isLoading = isAccountBalanceLoading || isConnectedWalletsBalanceLoading

  return {
    accountBalance,
    connectedWalletsBalance,
    totalBalance,
    isLoading
  }
}
