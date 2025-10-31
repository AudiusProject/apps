import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

const AUDIO_DECIMALS = 8

/**
 * Creates a swap transaction for swapping AUDIO to an artist coin using Meteora's DBC
 *
 * For now this just handles DBCs - it could be extended to include DAMMs as well
 *
 * Query params:
 * - inputAmountUi: Amount of AUDIO in UI format (human-readable, e.g., "100" for 100 AUDIO)
 * - outputMint: The mint address of the output token (artist coin)
 * - userPublicKey: The public key of the user initiating the swap
 * - swapDirection: The direction of the swap (either "audioToCoin" or "coinToAudio")
 *
 * Returns:
 * - transaction: Base64-encoded serialized transaction ready to be signed by the user
 * - outputAmount: The expected output amount in bigint format (raw token amount)
 */
export const swapCoin = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      inputAmountUi,
      coinMint,
      swapDirection,
      userPublicKey,
      isExternalWallet = false
    } = req.query

    // Validate required parameters
    if (!inputAmountUi || typeof inputAmountUi !== 'string') {
      res.status(400).json({
        error:
          'inputAmountUi is required and must be a string representing the UI amount of AUDIO'
      })
      return
    }

    if (
      !swapDirection ||
      typeof swapDirection !== 'string' ||
      (swapDirection !== 'audioToCoin' && swapDirection !== 'coinToAudio')
    ) {
      res.status(400).json({
        error:
          'swapDirection is required and must be a string representing the direction of the swap'
      })
      return
    }

    if (!coinMint || typeof coinMint !== 'string') {
      res.status(400).json({
        error: 'coinMint is required and must be a valid mint address'
      })
      return
    }

    if (!userPublicKey || typeof userPublicKey !== 'string') {
      res.status(400).json({
        error: 'userPublicKey is required and must be a valid public key'
      })
      return
    }

    // Validate public keys
    let coinMintPubkey: PublicKey
    let userPubkey: PublicKey
    try {
      coinMintPubkey = new PublicKey(coinMint)
      userPubkey = new PublicKey(userPublicKey)
    } catch (e) {
      res.status(400).json({
        error: 'outputMint and userPublicKey must be valid Solana public keys'
      })
      return
    }

    // Convert UI amount to bigint
    const inputAmountBN = new BN(
      Math.floor(parseFloat(inputAmountUi) * Math.pow(10, AUDIO_DECIMALS))
    )

    if (inputAmountBN.lte(new BN(0))) {
      res.status(400).json({
        error: 'inputAmountUi must be greater than 0'
      })
      return
    }
    // Inputs are all validated now 👍

    // Initialize Solana connection and DBC client
    const connection = getConnection()
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

    // Find the pool using the coin's mint
    const dbcPool = await dbcClient.state.getPoolByBaseMint(coinMintPubkey)

    if (!dbcPool) {
      res.status(404).json({
        error: `DBC pool not found for mint: ${coinMint}`
      })
      return
    }

    // Get the pool configuration
    const poolConfig = await dbcClient.state.getPoolConfig(
      dbcPool.account.config
    )
    if (!poolConfig) {
      res.status(404).json({
        error: `Pool config not found for pool: ${dbcPool.account.config.toString()}`
      })
      return
    }

    const currentPoint = await connection.getSlot()

    // Get swap quote
    const swapQuote = await dbcClient.pool.swapQuote({
      virtualPool: dbcPool.account,
      config: poolConfig,
      swapBaseForQuote: swapDirection === 'coinToAudio', // Base = coin, quote = audio
      amountIn: inputAmountBN,
      hasReferral: false,
      currentPoint: new BN(currentPoint)
    })

    // Create the swap transaction
    const swapTx = await dbcClient.pool.swap({
      owner: userPubkey,
      amountIn: inputAmountBN,
      minimumAmountOut: swapQuote.outputAmount,
      swapBaseForQuote: swapDirection === 'coinToAudio', // Base = coin, quote = audio
      pool: dbcPool.publicKey,
      referralTokenAccount: null,
      payer: userPubkey
    })

    // Get a random fee payer
    if (isExternalWallet) {
      swapTx.feePayer = userPubkey
    } else {
      if (
        !config.solanaFeePayerWallets ||
        config.solanaFeePayerWallets.length === 0
      ) {
        res.status(500).json({
          error: 'Relayer fee payer not configured.'
        })
        return
      }
      const index = Math.floor(
        Math.random() * config.solanaFeePayerWallets.length
      )
      swapTx.feePayer = config.solanaFeePayerWallets[index].publicKey
    }

    swapTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    // Serialize the transaction
    const serializedTx = Buffer.from(
      swapTx.serialize({ requireAllSignatures: false })
    ).toString('base64')

    // Return the transaction and expected output amount
    res.status(200).json({
      transaction: serializedTx,
      outputAmount: swapQuote.outputAmount.toString()
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: 'Failed to create coin swap transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
