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

/**
 * Hook that provides coin balance breakdown logic for both AUDIO and other coins.
 * Consolidates the logic previously duplicated between BalanceSection and BalanceCard components.
 */
export const useCoinBalanceBreakdown = ({
  mint,
  isAudio
}: UseCoinBalanceBreakdownParams) => {
  // Fetch wallet accounts for balance breakdown (for non-AUDIO coins)
  const { data: userCoins } = useUserCoin({ mint }, { enabled: !isAudio })
  const { accounts: unsortedAccounts = [], decimals } = userCoins ?? {}

  // For AUDIO, fetch ERC and SPL balances separately for built-in wallet
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

  // For AUDIO, fetch associated/linked wallets (both ETH and SOL)
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

  // Sort accounts by balance (descending) for non-AUDIO coins
  const accounts = useMemo(
    () => [...unsortedAccounts].sort((a, b) => b.balance - a.balance),
    [unsortedAccounts]
  )

  // Separate built-in wallet from linked wallets for non-AUDIO coins
  const inAppWallet = useMemo(
    () => accounts.find((account) => account.isInAppWallet),
    [accounts]
  )
  const linkedWallets = useMemo(
    () => accounts.filter((account) => !account.isInAppWallet),
    [accounts]
  )

  // For AUDIO, calculate the combined ERC + SPL balance for built-in wallet
  const audioBuiltInBalance = useMemo(() => {
    if (!isAudio) return null
    // AudioWei is a bigint - use bigint arithmetic to avoid precision loss
    // Wrap addition in AUDIO().value to maintain AudioWei branded type
    let totalWei = AUDIO(0).value
    for (const balanceData of audioBalances.data) {
      if (balanceData.balance) {
        totalWei = AUDIO(totalWei + balanceData.balance).value
      }
    }
    // AUDIO constructor handles bigint in wei for display formatting
    return AUDIO(totalWei).toLocaleString('en-US', {
      maximumFractionDigits: 2,
      roundingMode: 'trunc'
    })
  }, [isAudio, audioBalances.data])

  return {
    // For non-AUDIO coins
    accounts,
    decimals,
    inAppWallet,
    linkedWallets,
    // For AUDIO coins
    audioBuiltInBalance,
    associatedAudioBalances,
    // Common data
    hasBreakdown:
      linkedWallets.length > 0 ||
      (isAudio && audioBuiltInBalance) ||
      (isAudio && associatedAudioBalances.data.length > 0)
  }
}
