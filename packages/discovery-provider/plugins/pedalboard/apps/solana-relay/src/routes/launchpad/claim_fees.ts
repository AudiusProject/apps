import { CpAmm, getUnClaimReward } from '@meteora-ag/cp-amm-sdk'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { initializeDiscoveryDb } from '@pedalboard/basekit'
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

import { AUDIO_MINT } from './constants'

const db = initializeDiscoveryDb(config.discoveryDbConnectionString)

interface ClaimFeesRequestBody {
  tokenMint: string
  ownerWalletAddress: string
  receiverWalletAddress?: string
}

const getDBCPoolTxs = async (
  connection: Connection,
  poolAddress: string,
  ownerWalletAddress: string,
  receiverWalletAddress: string,
  ownerWalletAudioATA: PublicKey
) => {
  const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

  const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress))
  if (!poolState) {
    return
  }

  const ownerWallet = new PublicKey(ownerWalletAddress)
  const receiverWallet = new PublicKey(receiverWalletAddress)
  const maxQuoteAmount = poolState.creatorQuoteFee

  const claimFeesTx = await dbcClient.creator.claimCreatorTradingFee({
    pool: new PublicKey(poolAddress),
    payer: ownerWallet,
    creator: ownerWallet,
    maxBaseAmount: poolState.creatorBaseFee, // Match max amount to the claimable amount (effectively no limit)
    maxQuoteAmount, // Match max amount to the claimable amount (effectively no limit)
    receiver: ownerWallet
  })

  const sendFromOwnerWallet = createTransferInstruction(
    ownerWalletAudioATA,
    receiverWallet,
    ownerWallet,
    BigInt(maxQuoteAmount.toString())
  )
  claimFeesTx.instructions.push(sendFromOwnerWallet)

  claimFeesTx.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash
  claimFeesTx.feePayer = ownerWallet

  return claimFeesTx.serialize({ requireAllSignatures: false })
}

const getDammV2PoolTxs = async (
  connection: Connection,
  poolAddress: string,
  ownerWallet: PublicKey,
  receiverWallet: PublicKey,
  ownerWalletAudioATA: PublicKey
) => {
  const cpAmm = new CpAmm(connection)

  const poolState = await cpAmm.fetchPoolState(new PublicKey(poolAddress))
  if (!poolState) {
    return []
  }

  // Get all positions for this pool owned by the creator
  const ownerPositions = await cpAmm.getUserPositionByPool(
    new PublicKey(poolAddress),
    ownerWallet
  )

  if (ownerPositions.length === 0) {
    return []
  }

  const claimFeeTxs = []

  // Iterate through all positions owned by the creator - again this is very very likely to only be one, but technically could be multiple
  for (const positionInfo of ownerPositions) {
    const positionAddress = positionInfo.position
    const positionNftAccount = positionInfo.positionNftAccount

    const claimFeeTx = await cpAmm.claimPositionFee2({
      owner: ownerWallet,
      pool: new PublicKey(poolAddress),
      position: positionAddress,
      // Due to ATA issues we have to send the fees to the owner wallet then redirect them to the receiver wallet afterwards
      receiver: ownerWallet,
      positionNftAccount,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      // Both AUDIO and Artist coins are tokens (not SOL) - so we know both use token program id
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID
    })

    // Set blockhash and fee payer
    claimFeeTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash
    claimFeeTx.feePayer = ownerWallet
    const claimableAmount = getUnClaimReward(
      poolState,
      positionInfo.positionState
    )
    const claimableAmountBigInt = BigInt(claimableAmount.feeTokenB.toString())
    const sendFromOwnerWallet = createTransferInstruction(
      ownerWalletAudioATA,
      receiverWallet,
      ownerWallet,
      claimableAmountBigInt
    )
    claimFeeTx.instructions.push(sendFromOwnerWallet)

    claimFeeTxs.push(claimFeeTx.serialize({ requireAllSignatures: false }))
  }
  return claimFeeTxs
}

export const claimFees = async (
  req: Request<unknown, unknown, ClaimFeesRequestBody>,
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

    const [pools]: Array<{
      dbc_pool: string | null
      damm_v2_pool: string | null
    }> = await db('artist_coins')
      .where('mint', tokenMint)
      .leftJoin(
        'sol_meteora_dbc_pools',
        'artist_coins.mint',
        'sol_meteora_dbc_pools.base_mint'
      )
      .leftJoin(
        'sol_meteora_damm_v2_pools',
        'artist_coins.damm_v2_pool',
        'sol_meteora_damm_v2_pools.account'
      )
      .select(
        'sol_meteora_dbc_pools.account as dbc_pool',
        'sol_meteora_damm_v2_pools.account as damm_v2_pool'
      )
      .limit(1)

    const connection = getConnection()

    const ownerWallet = new PublicKey(ownerWalletAddress as string)
    const receiverWallet = receiverWalletAddress
      ? new PublicKey(receiverWalletAddress as string)
      : ownerWallet

    const ownerWalletAudioATA = getAssociatedTokenAddressSync(
      new PublicKey(AUDIO_MINT),
      ownerWallet,
      false
    )

    const claimFeeTxs = []

    // Attempt to get DBC claim fee transactions
    // A user can only have one claim fee transaction from the DBC but could also have fee TXs from the DAMM V2
    if (pools.dbc_pool !== null) {
      logger.debug('Attempting to get DBC claim fee transaction...')
      try {
        const dbcClaimFeeTx = await getDBCPoolTxs(
          connection,
          pools.dbc_pool,
          ownerWalletAddress as string,
          receiverWalletAddress as string,
          ownerWalletAudioATA
        )
        if (dbcClaimFeeTx) {
          claimFeeTxs.push(dbcClaimFeeTx)
        }
      } catch (e) {
        logger.error('error in claim_fees - DBC')
        logger.error(e)
      }
    }

    // Attempt to get DAMM V2 claim fee transactions
    // A user can technically have multiple claim fee transactions from the DAMM V2 (but this is unlikely for our users)
    if (pools.damm_v2_pool !== null) {
      logger.debug('Attempting to get DAMM V2 claim fee transactions...')
      try {
        const dammV2ClaimFeeTxs = await getDammV2PoolTxs(
          connection,
          tokenMint as string,
          ownerWallet,
          receiverWallet,
          ownerWalletAudioATA
        )
        claimFeeTxs.push(...dammV2ClaimFeeTxs)
      } catch (e) {
        logger.error('error in claim_fees - DAMM V2')
        logger.error(e)
      }
    }

    return res.status(200).send({
      claimFeeTxs
    })
  } catch (e) {
    logger.error(e)
    logger.error(
      'Error in claim_fees - unable to create claim fee transactions'
    )
    res.status(500).send({
      error: e instanceof Error ? e.message : 'Unknown error'
    })
  }
}
