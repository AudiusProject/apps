import { useQuery } from '@tanstack/react-query'
import {
  DynamicBondingCurveClient,
  deriveBaseKeyForLocker,
  deriveEscrow
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { LockClient } from '@meteora-ag/met-lock-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { env } from 'services/env'

interface EscrowState {
  vestingStartTime: BN
  cliffTime: BN
  frequency: BN
  amountPerPeriod: BN
  numberOfPeriod: BN
  cliffUnlockAmount: BN
  totalClaimedAmount: BN
  recipient: PublicKey
}

/**
 * Helper function to calculate available amount to claim from vesting escrow
 */
function calculateAvailableAmount(
  escrowState: EscrowState,
  currentTime: number
): BN {
  const cliffTime = escrowState.cliffTime.toNumber()
  const vestingStartTime = escrowState.vestingStartTime.toNumber()
  const frequency = escrowState.frequency.toNumber()
  const amountPerPeriod = escrowState.amountPerPeriod
  const numberOfPeriods = escrowState.numberOfPeriod.toNumber()
  const cliffUnlockAmount = escrowState.cliffUnlockAmount
  const totalClaimedAmount = escrowState.totalClaimedAmount

  let availableAmount = new BN(0)

  // Check if cliff period has passed
  if (currentTime >= cliffTime) {
    availableAmount = availableAmount.add(cliffUnlockAmount)

    // Calculate periods completed since vesting start
    const timeSinceVestingStart = currentTime - vestingStartTime
    if (timeSinceVestingStart > 0 && frequency > 0) {
      const periodsCompleted = Math.floor(timeSinceVestingStart / frequency)
      const validPeriodsCompleted = Math.min(periodsCompleted, numberOfPeriods)

      const periodicAmount = amountPerPeriod.mul(new BN(validPeriodsCompleted))
      availableAmount = availableAmount.add(periodicAmount)
    }
  }

  // Subtract already claimed amount
  availableAmount = availableAmount.sub(totalClaimedAmount)

  // Ensure we don't return negative amounts
  return availableAmount.lt(new BN(0)) ? new BN(0) : availableAmount
}

/**
 * Helper function to calculate next unlock time
 */
function calculateNextUnlockTime(
  escrowState: EscrowState,
  currentTime: number
): number {
  const cliffTime = escrowState.cliffTime.toNumber()
  const vestingStartTime = escrowState.vestingStartTime.toNumber()
  const frequency = escrowState.frequency.toNumber()
  const numberOfPeriods = escrowState.numberOfPeriod.toNumber()

  // If still in cliff period, return cliff time
  if (currentTime < cliffTime) {
    return cliffTime
  }

  // Calculate next period unlock time
  const timeSinceVestingStart = currentTime - vestingStartTime
  if (timeSinceVestingStart >= 0 && frequency > 0) {
    const periodsCompleted = Math.floor(timeSinceVestingStart / frequency)

    if (periodsCompleted < numberOfPeriods) {
      return vestingStartTime + (periodsCompleted + 1) * frequency
    }
  }

  // All periods completed
  return 0
}

export interface VestedCoinsInfo {
  totalAmount: number
  claimedAmount: number
  availableAmount: number
  lockedAmount: number
  nextUnlockTime: number
  hoursUntilNextUnlock: number
}

interface UseVestedCoinsInfoProps {
  mint: string
  enabled?: boolean
}

async function fetchVestedCoinsInfo(mint: string): Promise<VestedCoinsInfo> {
  const connection = new Connection(env.SOLANA_CLUSTER_ENDPOINT, 'confirmed')
  const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')
  const lockClient = new LockClient(connection, 'confirmed')

  const mintPublicKey = new PublicKey(mint)

  // Find the original DBC pool using the mint address
  const originalDbcPool = await dbcClient.state.getPoolByBaseMint(mintPublicKey)

  if (!originalDbcPool) {
    throw new Error('Could not find DBC pool for the given mint address')
  }

  // Derive the locker addresses
  const base = deriveBaseKeyForLocker(originalDbcPool.publicKey)
  const escrow = deriveEscrow(base)

  // Check if escrow account exists
  const escrowAccount = await connection.getAccountInfo(escrow)
  if (!escrowAccount) {
    throw new Error('Escrow account does not exist')
  }

  // Get escrow state
  const escrowState = (await lockClient.getEscrow(escrow)) as EscrowState
  console.log('Escrow state retrieved', {
    address: escrow.toBase58(),
    vestingStartTime: escrowState.vestingStartTime.toString(),
    cliffTime: escrowState.cliffTime.toString(),
    frequency: escrowState.frequency.toString(),
    amountPerPeriod: escrowState.amountPerPeriod.toString(),
    numberOfPeriod: escrowState.numberOfPeriod.toString(),
    totalClaimedAmount: escrowState.totalClaimedAmount.toString(),
    recipient: escrowState.recipient.toBase58()
  })

  // Calculate total amount and available amount
  const totalAmount = escrowState.cliffUnlockAmount.add(
    escrowState.amountPerPeriod.mul(escrowState.numberOfPeriod)
  )
  const currentTime = Math.floor(Date.now() / 1000)
  const availableAmount = calculateAvailableAmount(escrowState, currentTime)
  const claimedAmount = escrowState.totalClaimedAmount
  const lockedAmount = totalAmount.sub(claimedAmount).sub(availableAmount)

  const nextUnlockTime = calculateNextUnlockTime(escrowState, currentTime)
  const hoursUntilNextUnlock =
    nextUnlockTime > currentTime ? (nextUnlockTime - currentTime) / 3600 : 0

  return {
    totalAmount: Number(totalAmount.toString()),
    claimedAmount: Number(claimedAmount.toString()),
    availableAmount: Number(availableAmount.toString()),
    lockedAmount: Number(lockedAmount.toString()),
    nextUnlockTime,
    hoursUntilNextUnlock
  }
}

/**
 * Hook to fetch vested coins information from Meteora Lock SDK
 * This fetches the actual vesting state directly from Solana
 */
export const useVestedCoinsInfo = ({
  mint,
  enabled = true
}: UseVestedCoinsInfoProps) => {
  return useQuery({
    queryKey: ['vestedCoinsInfo', mint],
    queryFn: () => fetchVestedCoinsInfo(mint),
    enabled: enabled && !!mint,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 2
  })
}
