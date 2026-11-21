import { useMemo } from 'react'

import { AUDIO } from '@audius/fixed-decimal'

import {
  useAssociatedWallets,
  useCurrentAccountUser,
  useUserCoin,
  useWalletAudioBalances
} from '~/api'
import { Chain } from '~/models'

type UseCoinBalanceBreakdownParams = {
  mint: string
  isAudio: boolean
}

export type WalletAccount = {
  owner: string
  balance: number
  isInAppWallet?: boolean
}

export type AudioWalletBalance = {
  balance: bigint | null
  chain: Chain
  address: string
}

export const useCoinBalanceBreakdown = ({
  mint,
  isAudio
}: UseCoinBalanceBreakdownParams) => {
  const { data: userCoins } = useUserCoin({ mint }, { enabled: !isAudio })
  const { accounts: unsortedAccounts = [], decimals } = userCoins ?? {}

  const { data: currentUser } = useCurrentAccountUser()
  const audioBalances = useWalletAudioBalances(
    {
      wallets: [
        ...(currentUser?.erc_wallet
          ? [{ address: currentUser.erc_wallet, chain: Chain.Eth }]
          : []),
        ...(currentUser?.spl_wallet
          ? [{ address: currentUser.spl_wallet, chain: Chain.Sol }]
          : [])
      ],
      includeStaked: false
    },
    { enabled: isAudio }
  )

  const { data: associatedWallets = [] } = useAssociatedWallets({
    enabled: isAudio
  })
  const associatedAudioBalances = useWalletAudioBalances(
    {
      wallets: associatedWallets,
      includeStaked: false
    },
    { enabled: isAudio && associatedWallets.length > 0 }
  )

  const accounts = useMemo(
    () => [...unsortedAccounts].sort((a, b) => b.balance - a.balance),
    [unsortedAccounts]
  )

  const inAppWallet = useMemo(
    () => accounts.find((account) => account.isInAppWallet),
    [accounts]
  )
  const linkedWallets = useMemo(
    () => accounts.filter((account) => !account.isInAppWallet),
    [accounts]
  )

  const audioBuiltInBalance = useMemo(() => {
    if (!isAudio) return null
    let totalWei = AUDIO(0).value
    for (const balanceData of audioBalances.data) {
      if (balanceData.balance) {
        totalWei = AUDIO(totalWei + balanceData.balance).value
      }
    }
    return AUDIO(totalWei).toLocaleString('en-US', {
      maximumFractionDigits: 2,
      roundingMode: 'trunc'
    })
  }, [isAudio, audioBalances.data])

  return {
    accounts,
    decimals,
    inAppWallet,
    linkedWallets,
    audioBuiltInBalance,
    associatedAudioBalances,
    hasBreakdown:
      linkedWallets.length > 0 ||
      (isAudio && audioBuiltInBalance) ||
      (isAudio && associatedAudioBalances.data.length > 0)
  }
}
