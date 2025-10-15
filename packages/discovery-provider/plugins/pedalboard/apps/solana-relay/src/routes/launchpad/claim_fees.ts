import { CpAmm, getUnClaimReward } from '@meteora-ag/cp-amm-sdk'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { Request, Response } from 'express'

import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

import { AUDIO_MINT } from './constants'

interface ClaimFeesRequestBody {
  tokenMint: string
  ownerWalletAddress: string
  receiverWalletAddress?: string
}

const getDBCPoolTxs = async (
  connection: Connection,
  tokenMint: string,
  ownerWalletAddress: string,
  receiverWalletAddress: string,
  ownerWalletAudioATA: PublicKey
) => {
  const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

  const tokenPool = await dbcClient.state.getPoolByBaseMint(
    new PublicKey(tokenMint)
  )
  if (!tokenPool) {
    return
  }

  const poolAddress = tokenPool.publicKey
  const poolData = tokenPool.account
  const ownerWallet = new PublicKey(ownerWalletAddress)
  const receiverWallet = new PublicKey(receiverWalletAddress)
  const maxQuoteAmount = poolData.creatorQuoteFee

  const claimFeesTx = await dbcClient.creator.claimCreatorTradingFee({
    pool: poolAddress,
    payer: ownerWallet,
    creator: ownerWallet,
    maxBaseAmount: poolData.creatorBaseFee, // Match max amount to the claimable amount (effectively no limit)
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
  tokenMint: string,
  ownerWallet: PublicKey,
  receiverWallet: PublicKey,
  ownerWalletAudioATA: PublicKey
) => {
  const cpAmm = new CpAmm(connection)
  // Get all pools and find the one matching the token mint
  const allPools = await cpAmm.getAllPools()
  const targetPool = allPools.find(
    (pool) =>
      pool.account.tokenAMint.toBase58() === tokenMint ||
      pool.account.tokenBMint.toBase58() === tokenMint
  )

  if (!targetPool) {
    return []
  }

  const poolAddress = targetPool.publicKey
  const poolState = targetPool.account

  // Get all positions for this pool owned by the creator
  const ownerPositions = await cpAmm.getUserPositionByPool(
    poolAddress,
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
      pool: poolAddress,
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
    try {
      const dbcClaimFeeTx = await getDBCPoolTxs(
        connection,
        tokenMint as string,
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

    // Attempt to get DAMM V2 claim fee transactions
    // A user can technically have multiple claim fee transactions from the DAMM V2 (but this is unlikely for our users)
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
