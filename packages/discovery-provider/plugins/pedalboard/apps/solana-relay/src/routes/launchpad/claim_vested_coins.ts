import { initializeDiscoveryDb } from '@pedalboard/basekit'
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { LockClient } from '@meteora-ag/met-lock-sdk'
import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

const db = initializeDiscoveryDb(config.discoveryDbConnectionString)

interface ClaimVestedCoinsRequestBody {
  tokenMint: string
  ownerWalletAddress: string
  receiverWalletAddress?: string
  rewardsPoolPercentage?: number
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
    const {
      tokenMint,
      ownerWalletAddress,
      receiverWalletAddress,
      rewardsPoolPercentage
    } = req.query

    // Validate required parameters
    if (!tokenMint || !ownerWalletAddress || !receiverWalletAddress) {
      throw new Error(
        'Invalid request parameters. tokenMint, ownerWalletAddress, and receiverWalletAddress are required.'
      )
    }

    // Validate rewardsPoolPercentage
    const rewardsPoolPct = rewardsPoolPercentage
      ? parseInt(rewardsPoolPercentage as string, 10)
      : 0
    if (isNaN(rewardsPoolPct) || rewardsPoolPct < 0 || rewardsPoolPct > 100) {
      throw new Error(
        'Invalid rewardsPoolPercentage. Must be a number between 0 and 100.'
      )
    }

    const ownerWallet = new PublicKey(ownerWalletAddress)
    const receiverWallet = new PublicKey(receiverWalletAddress)
    const mintPublicKey = new PublicKey(tokenMint)
    const connection = getConnection()

    logger.info({
      message: 'Claim vested coins request',
      tokenMint,
      ownerWalletAddress: ownerWallet.toBase58(),
      receiverWalletAddress: receiverWallet.toBase58(),
      rewardsPoolPercentage
    })

    // Get all vesting information from database
    const vestingResult = await db.raw<{
      rows: Array<{
        escrow_account: string
        recipient: string
        vesting_start_time: string
        cliff_time: string
        frequency: string
        cliff_unlock_amount: string
        amount_per_period: string
        number_of_period: string
        total_claimed_amount: string
      }>
    }>(
      `
      SELECT
        account as escrow_account,
        recipient,
        vesting_start_time,
        cliff_time,
        frequency,
        cliff_unlock_amount,
        amount_per_period,
        number_of_period,
        total_claimed_amount
      FROM sol_locker_vesting_escrows
      WHERE token_mint = ? AND recipient = ?
      `,
      [mintPublicKey.toBase58(), ownerWallet.toBase58()]
    )

    if (!vestingResult.rows || vestingResult.rows.length === 0) {
      throw new Error(
        `No vesting escrow found for mint: ${mintPublicKey.toBase58()}`
      )
    }

    const vestingData = vestingResult.rows[0]

    logger.info({
      message: 'Found vesting data from database',
      escrowAccount: vestingData.escrow_account,
      recipient: vestingData.recipient
    })

    const escrow = new PublicKey(vestingData.escrow_account)
    const escrowRecipient = new PublicKey(vestingData.recipient)

    // Check if escrow account exists
    const escrowAccount = await connection.getAccountInfo(escrow)
    if (!escrowAccount) {
      throw new Error('Escrow account does not exist')
    }

    // Create escrow state object from database data
    const escrowState: EscrowState = {
      vestingStartTime: new BN(vestingData.vesting_start_time),
      cliffTime: new BN(vestingData.cliff_time),
      frequency: new BN(vestingData.frequency),
      amountPerPeriod: new BN(vestingData.amount_per_period),
      numberOfPeriod: new BN(vestingData.number_of_period),
      cliffUnlockAmount: new BN(vestingData.cliff_unlock_amount),
      totalClaimedAmount: new BN(vestingData.total_claimed_amount),
      recipient: escrowRecipient
    }

    // Calculate total amount and available amount
    const totalAmount = escrowState.cliffUnlockAmount.add(
      escrowState.amountPerPeriod.mul(escrowState.numberOfPeriod)
    )
    const currentTime = Math.floor(Date.now() / 1000)
    const availableAmount = calculateAvailableAmount(escrowState, currentTime)

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
    // NOTE: recipient must be a signer, so we claim to ownerWallet (root wallet)
    // Then immediately transfer to the user bank in the same transaction
    const lockClient = new LockClient(connection, 'confirmed')
    const claimTx = await lockClient.claimV2({
      escrow: escrow,
      recipient: ownerWallet,
      maxAmount: availableAmount,
      payer: ownerWallet
    })

    // Calculate split amounts based on rewards pool percentage
    const userAmount = availableAmount
      .mul(new BN(100 - rewardsPoolPct))
      .div(new BN(100))
    const rewardsPoolAmount = availableAmount
      .mul(new BN(rewardsPoolPct))
      .div(new BN(100))

    logger.info({
      message: 'Rewards pool allocation',
      totalAvailable: availableAmount.toString(),
      userAmount: userAmount.toString(),
      rewardsPoolAmount: rewardsPoolAmount.toString(),
      rewardsPoolPercentage: rewardsPoolPct
    })

    // Add transfer instruction from owner wallet (external wallet) to user bank
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      mintPublicKey,
      ownerWallet,
      false
    )

    // Transfer user portion to user bank
    if (userAmount.gt(new BN(0))) {
      const userTransferInstruction = createTransferCheckedInstruction(
        ownerTokenAccount, // source
        mintPublicKey, // mint
        receiverWallet, // destination (user bank)
        ownerWallet, // owner of source account
        BigInt(userAmount.toString()), // amount as BigInt to handle large values
        9 // decimals for artist coins (matches SPL token standard)
      )
      claimTx.add(userTransferInstruction)
    }

    let rewardsPoolAddress: PublicKey | null = null
    // Transfer rewards pool portion to rewards pool token account if provided
    if (rewardsPoolAmount.gt(new BN(0))) {
      const rewardsPoolAuthorityResult = await db.raw<{
        rows: Array<{ authority: string }>
      }>(
        `
      SELECT authority 
      FROM artist_coins ac 
      JOIN sol_reward_manager_inits r ON r.mint = ac.mint
      WHERE ac.mint = ?
      `,
        [mintPublicKey.toBase58()]
      )

      if (
        !rewardsPoolAuthorityResult.rows ||
        rewardsPoolAuthorityResult.rows.length === 0
      ) {
        throw new Error(
          `Could not find rewards pool address for mint: ${mintPublicKey.toBase58()}`
        )
      }

      const rewardsPoolAuthority = new PublicKey(
        rewardsPoolAuthorityResult.rows[0].authority
      )

      rewardsPoolAddress = getAssociatedTokenAddressSync(
        mintPublicKey,
        rewardsPoolAuthority,
        true
      )
      // Check if rewards pool ATA exists - it should already exist
      const rewardsPoolAccountInfo =
        await connection.getAccountInfo(rewardsPoolAddress)
      if (!rewardsPoolAccountInfo) {
        throw new Error(
          `Rewards pool token account does not exist: ${rewardsPoolAddress.toBase58()}`
        )
      }

      const rewardsPoolTransferInstruction = createTransferCheckedInstruction(
        ownerTokenAccount, // source
        mintPublicKey, // mint
        rewardsPoolAddress, // destination (rewards pool)
        ownerWallet, // owner of source account
        BigInt(rewardsPoolAmount.toString()), // amount as BigInt to handle large values
        9 // decimals for artist coins (matches SPL token standard)
      )
      claimTx.add(rewardsPoolTransferInstruction)
    }

    logger.info({
      message: 'Added transfer instructions',
      userTransferAmount: userAmount.toString(),
      rewardsPoolTransferAmount: rewardsPoolAmount.toString(),
      rewardsPoolAddress: rewardsPoolAddress ?? 'not provided',
      from: ownerTokenAccount.toBase58(),
      to: receiverWallet.toBase58()
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
        .toString(),
      userClaimedAmount: userAmount.toString(),
      rewardsPoolClaimedAmount: rewardsPoolAmount.toString()
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
