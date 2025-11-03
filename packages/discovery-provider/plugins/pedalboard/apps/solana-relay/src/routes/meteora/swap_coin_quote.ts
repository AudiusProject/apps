import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

const AUDIO_DECIMALS = 8

/**
 * Gets a quote for swapping AUDIO to/from an artist coin using Meteora's DBC
 *
 * For now this just handles DBCs - it could be extended to include DAMMs as well
 *
 * Query params:
 * - inputAmountUi: Amount in UI format (human-readable, e.g., "100")
 * - coinMint: The mint address of the artist coin
 * - swapDirection: The direction of the swap (either "audioToCoin" or "coinToAudio")
 *
 * Returns:
 * - outputAmount: The quoted output amount in bigint format
 */
export const swapCoinQuote = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { inputAmountUi, coinMint, swapDirection } = req.query

    // Validate required parameters
    if (!inputAmountUi || typeof inputAmountUi !== 'string') {
      res.status(400).json({
        error:
          'inputAmountUi is required and must be a string representing the UI amount'
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

    // Validate public keys
    let coinMintPubkey: PublicKey
    try {
      coinMintPubkey = new PublicKey(coinMint)
    } catch (e) {
      res.status(400).json({
        error: 'coinMint must be a valid Solana public key'
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
    const quote = await dbcClient.pool.swapQuote({
      virtualPool: dbcPool.account,
      config: poolConfig,
      swapBaseForQuote: swapDirection === 'coinToAudio', // Base = coin, quote = audio
      amountIn: inputAmountBN,
      hasReferral: false,
      currentPoint: new BN(currentPoint)
    })

    // Return the output amount in bigint format
    res.status(200).json({
      outputAmount: quote.outputAmount.toString()
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: 'Failed to get coin swap quote',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
