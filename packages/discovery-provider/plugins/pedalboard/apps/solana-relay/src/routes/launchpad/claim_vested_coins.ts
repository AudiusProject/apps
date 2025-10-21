import {
  DynamicBondingCurveClient,
  deriveBaseKeyForLocker,
  deriveEscrow
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { LockClient } from '@meteora-ag/met-lock-sdk'
import { PublicKey, Transaction } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

interface ClaimVestedCoinsRequestBody {
  tokenMint: string
  ownerWalletAddress: string
  receiverWalletAddress?: string
}

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

/**
 * Claims vested/unlocked artist coins from the vesting schedule.
 * After an artist coin graduates, the artist's reserved coins unlock daily over a 5-year period.
 *
 * This endpoint uses the Meteora Lock SDK to claim vested tokens from the escrow account.
 */
export const claimVestedCoins = async (
  req: Request<unknown, unknown, ClaimVestedCoinsRequestBody>,
  res: Response
) => {
  try {
    const { tokenMint, ownerWalletAddress, receiverWalletAddress } = req.query

    // Validate required parameters
    if (!tokenMint || !ownerWalletAddress || !receiverWalletAddress) {
      throw new Error(
        'Invalid request parameters. tokenMint, ownerWalletAddress, and receiverWalletAddress are required.'
      )
    }

    const connection = getConnection()

    const ownerWallet = new PublicKey(ownerWalletAddress as string)
    const receiverWallet = new PublicKey(receiverWalletAddress)
    const mintPublicKey = new PublicKey(tokenMint as string)

    logger.info({
      message: 'Claim vested coins request',
      tokenMint,
      ownerWalletAddress: ownerWallet.toBase58(),
      receiverWalletAddress: receiverWallet.toBase58()
    })

    // Initialize clients
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')
    const lockClient = new LockClient(connection, 'confirmed')

    // Find the original DBC pool using the mint address
    const originalDbcPool =
      await dbcClient.state.getPoolByBaseMint(mintPublicKey)

    if (!originalDbcPool) {
      throw new Error('Could not find DBC pool for the given mint address')
    }

    logger.info({
      message: 'Found DBC pool',
      poolAddress: originalDbcPool.publicKey.toBase58()
    })

    // Get the pool state to access the config
    const dbcPoolState = await dbcClient.state.getPool(
      originalDbcPool.publicKey
    )
    if (!dbcPoolState) {
      throw new Error('Could not fetch DBC pool state')
    }

    // Derive the locker addresses
    const base = deriveBaseKeyForLocker(originalDbcPool.publicKey)
    const escrow = deriveEscrow(base)

    logger.info({
      message: 'Derived locker addresses',
      base: base.toBase58(),
      escrow: escrow.toBase58()
    })

    // Check if escrow account exists
    const escrowAccount = await connection.getAccountInfo(escrow)
    if (!escrowAccount) {
      throw new Error('Escrow account does not exist')
    }

    // Check if user is authorized to claim (is the pool creator)
    if (!dbcPoolState.creator.equals(ownerWallet)) {
      throw new Error(
        `You are not the pool creator. Pool creator: ${dbcPoolState.creator.toBase58()}, Your wallet: ${ownerWallet.toBase58()}`
      )
    }

    // Get escrow state
    const escrowState = await lockClient.getEscrow(escrow)

    logger.info({
      message: 'Escrow state retrieved',
      vestingStartTime: escrowState.vestingStartTime.toString(),
      cliffTime: escrowState.cliffTime.toString(),
      frequency: escrowState.frequency.toString(),
      amountPerPeriod: escrowState.amountPerPeriod.toString(),
      numberOfPeriod: escrowState.numberOfPeriod.toString(),
      totalClaimedAmount: escrowState.totalClaimedAmount.toString(),
      recipient: escrowState.recipient.toBase58()
    })

    // Verify that the owner is the recipient
    if (!escrowState.recipient.equals(ownerWallet)) {
      throw new Error(
        `You are not the recipient of this vesting escrow. Escrow recipient: ${escrowState.recipient.toBase58()}, Your wallet: ${ownerWallet.toBase58()}`
      )
    }

    // Calculate total amount and available amount
    const totalAmount = escrowState.cliffUnlockAmount.add(
      escrowState.amountPerPeriod.mul(escrowState.numberOfPeriod)
    )
    const currentTime = Math.floor(Date.now() / 1000)
    // const availableAmount =
    //   calculateAvailableAmount(escrowState, currentTime)
    const availableAmount = new BN(1)

    logger.info({
      message: 'Vesting calculation',
      totalAmount: totalAmount.toString(),
      claimedAmount: escrowState.totalClaimedAmount.toString(),
      availableAmount: availableAmount.toString(),
      currentTime
    })

    if (availableAmount.eq(new BN(0))) {
      const nextUnlockTime = calculateNextUnlockTime(escrowState, currentTime)
      const hoursUntilNextUnlock =
        nextUnlockTime > currentTime ? (nextUnlockTime - currentTime) / 3600 : 0

      return res.status(200).send({
        claimVestedCoinsTxs: [],
        availableAmount: '0',
        totalAmount: totalAmount.toString(),
        claimedAmount: escrowState.totalClaimedAmount.toString(),
        nextUnlockTime,
        hoursUntilNextUnlock: hoursUntilNextUnlock.toFixed(2),
        message:
          hoursUntilNextUnlock > 0
            ? `No tokens are currently available to claim. Next unlock in ${hoursUntilNextUnlock.toFixed(2)} hours.`
            : 'All vesting periods completed. All tokens should be available.'
      })
    }

    // Create the claim transaction using Meteora Lock SDK claimV2
    const claimTx = await lockClient.claimV2({
      escrow: escrow,
      recipient: receiverWallet,
      maxAmount: availableAmount,
      payer: ownerWallet
    })

    // Set transaction properties
    claimTx.feePayer = ownerWallet
    const { blockhash } = await connection.getLatestBlockhash()
    claimTx.recentBlockhash = blockhash

    // Serialize the transaction without signatures
    const serializedTx = claimTx.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    })

    logger.info({
      message: 'Claim transaction created',
      availableAmount: availableAmount.toString(),
      remainingLocked: totalAmount
        .sub(escrowState.totalClaimedAmount)
        .sub(availableAmount)
        .toString()
    })

    return res.status(200).send({
      claimVestedCoinsTxs: [serializedTx],
      availableAmount: availableAmount.toString(),
      totalAmount: totalAmount.toString(),
      claimedAmount: escrowState.totalClaimedAmount.toString(),
      remainingLocked: totalAmount
        .sub(escrowState.totalClaimedAmount)
        .sub(availableAmount)
        .toString()
    })
  } catch (e) {
    logger.error(e)
    logger.error(
      'Error in claim_vested_coins - unable to create claim vested coins transactions'
    )
    res.status(500).send({
      error: e instanceof Error ? e.message : 'Unknown error'
    })
  }
}
