import { AUDIO, AudioWei } from '@audius/fixed-decimal'
import { PublicKey } from '@solana/web3.js'

import { useUser } from '~/api/tan-query/users/useUser'
import { Maybe, Nullable } from '~/utils'

import { BadgeTier } from '../../models/BadgeTier'
import { ID } from '../../models/Identifiers'
import { SolanaWalletAddress, StringWei } from '../../models/Wallet'

export type BadgeTierInfo = {
  tier: BadgeTier
  minAudio: AudioWei
  humanReadableAmount: number
}

export const badgeTiers: BadgeTierInfo[] = [
  {
    tier: 'platinum',
    minAudio: AUDIO('10000').value,
    humanReadableAmount: 10000
  },
  {
    tier: 'gold',
    minAudio: AUDIO('1000').value,
    humanReadableAmount: 1000
  },
  {
    tier: 'silver',
    minAudio: AUDIO('100').value,
    humanReadableAmount: 100
  },
  {
    tier: 'bronze',
    minAudio: AUDIO('10').value,
    humanReadableAmount: 10
  },
  {
    tier: 'none',
    minAudio: AUDIO('0').value,
    humanReadableAmount: 0
  }
]

/**
 * Hook to get the tier and verification status for a user
 * @param userId Optional user ID to check. If not provided, uses the current user
 * @returns Object containing tier, isVerified, and tierNumber
 */
export const useTierAndVerifiedForUser = (userId: Maybe<Nullable<ID>>) => {
  const { data: user } = useUser(userId, {
    select: (user) => ({
      total_balance: user.total_balance,
      is_verified: user.is_verified
    })
  })

  if (!user)
    return { tier: 'none' as BadgeTier, isVerified: false, tierNumber: 0 }

  const balance = user.total_balance ?? ('0' as StringWei)
  const { tier, tierNumber } = getTierAndNumberForBalance(balance)
  const isVerified = !!user.is_verified

  return { tier, isVerified, tierNumber }
}

// Helpers

export const getTierAndNumberForBalance = (
  balance: StringWei,
  useWei: boolean = true
) => {
  const audio = useWei ? BigInt(balance) : BigInt(balance) * BigInt(10 ** 10)

  const index = badgeTiers.findIndex((t) => {
    return t.minAudio <= audio
  })

  const tier = index === -1 ? 'none' : badgeTiers[index].tier
  const tierNumber = index === -1 ? 0 : 4 - index

  return { tier, tierNumber }
}

/** Gets tier number, highest tier being badgeTiers.length, lowest being 1  */
export const getTierNumber = (tier: BadgeTier) =>
  badgeTiers.length - badgeTiers.findIndex((t) => t.tier === tier)

export const getTierForUser = (totalBalance: Nullable<StringWei>) => {
  const balance = totalBalance ?? ('0' as StringWei)
  return getTierAndNumberForBalance(balance).tier
}

// The other fns here use wei formatting, new fan club data doesnt use wei
export const getTierForUserNonWei = (totalBalance: Nullable<StringWei>) => {
  const balance = totalBalance ?? ('0' as StringWei)
  return getTierAndNumberForBalance(balance, false).tier
}

/**
 * Checks whether the input address is a valid solana address.
 */
export const isValidSolAddress = (address: SolanaWalletAddress) => {
  try {
    // @ts-ignore - need an unused variable to check if the destinationWallet is valid
    const ignored = new PublicKey(address)
    return true
  } catch (err) {
    console.debug(err)
    return false
  }
}
