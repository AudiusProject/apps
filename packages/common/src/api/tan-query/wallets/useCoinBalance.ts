import { AUDIO, FixedDecimal } from '@audius/fixed-decimal'

import {
  useAudioBalance,
  useCurrentAccountUser,
  useUser,
  useUserCoin,
  type UseAudioBalanceOptions,
  type UseUserCoinOptions
} from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { useUSDCBalance, type UseUSDCBalanceOptions } from './useUSDCBalance'

const USDC_DECIMALS = 6
const WEI_DECIMALS = 18

export const useCoinBalance = ({
  mint,
  userId,
  isPolling,
  pollingInterval = 1000,
  includeExternalWallets = true,
  includeStaked = true,
  walletAddress,
  ...queryOptions
}: {
  mint: string
  userId?: ID
  isPolling?: boolean
  includeExternalWallets?: boolean
  includeStaked?: boolean
  pollingInterval?: number
  walletAddress?: string
} & UseAudioBalanceOptions &
  UseUserCoinOptions<any> &
  UseUSDCBalanceOptions<any>) => {
  const { env } = useQueryContext()
  const { data: userById } = useUser(userId)
  const { data: currentUser } = useCurrentAccountUser({ enabled: !userId })
  const user = userId ? userById : currentUser
  const ethAddress = user?.wallet ?? null
  const isUsdc = mint === env.USDC_MINT_ADDRESS
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS

  const audioCoinQuery = useAudioBalance(
    {
      userId,
      includeConnectedWallets: includeExternalWallets,
      includeStaked
    },
    {
      refetchInterval: isPolling ? pollingInterval : undefined,
      refetchOnWindowFocus: !isPolling,
      ...queryOptions,
      enabled: isAudio && queryOptions.enabled !== false
    }
  )

  const userCoinQuery = useUserCoin(
    { mint, userId },
    {
      select: (aggregateCoinAccounts) => {
        if (!aggregateCoinAccounts) return null
        const { balance: combinedBalance, decimals } = aggregateCoinAccounts
        if (!includeExternalWallets) {
          const account = aggregateCoinAccounts.accounts.find(
            (account) => account.isInAppWallet
          )
          if (!account) return null
          const balanceFD = new FixedDecimal(
            BigInt(account.balance.toString()),
            decimals
          )
          return {
            balance: balanceFD,
            balanceLocaleString: balanceFD.toLocaleString(),
            decimals
          }
        }

        const balanceFD = new FixedDecimal(
          BigInt(combinedBalance.toString()),
          decimals
        )

        return {
          balance: balanceFD,
          balanceLocaleString: balanceFD.toLocaleString(),
          decimals
        }
      },
      refetchInterval: isPolling ? pollingInterval : undefined,
      refetchOnWindowFocus: !isPolling,
      ...queryOptions,
      enabled: !isUsdc && queryOptions.enabled !== false
    }
  )

  const usdcQuery = useUSDCBalance({
    isPolling,
    pollingInterval,
    select: (usdcBalance) => {
      if (!usdcBalance) return null

      const balanceFD = new FixedDecimal(
        BigInt(usdcBalance.toString()),
        USDC_DECIMALS
      )

      return {
        balance: balanceFD,
        balanceLocaleString: balanceFD.toLocaleString(),
        decimals: USDC_DECIMALS
      }
    },
    ...queryOptions,
    enabled: isUsdc && !!ethAddress && queryOptions.enabled !== false
  })

  if (isUsdc) return usdcQuery

  if (isAudio) {
    return {
      data: {
        balance: AUDIO(audioCoinQuery.totalBalance),
        balanceLocaleString: AUDIO(
          audioCoinQuery.totalBalance
        ).toLocaleString(),
        decimals: WEI_DECIMALS
      },
      isLoading: audioCoinQuery.isLoading,
      isPending: audioCoinQuery.isLoading,
      isError: audioCoinQuery.isError
    }
  }
  return userCoinQuery
}
