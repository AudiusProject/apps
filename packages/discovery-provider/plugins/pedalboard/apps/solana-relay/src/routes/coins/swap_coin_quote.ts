import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

const AUDIO_DECIMALS = 8

/**
 * Gets a quote for swapping AUDIO to an artist coin using Meteora's DBC
 *
 * Query params:
 * - audioInputAmount: Amount of AUDIO in UI format (human-readable, e.g., "100" for 100 AUDIO)
 * - outputMint: The mint address of the output token (artist coin)
 *
 * Returns:
 * - outputAmount: The quoted output amount in bigint format
 */
export const swapCoinQuote = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { inputAmountUi, outputMint } = req.query

    // Validate required parameters
    if (!inputAmountUi || typeof inputAmountUi !== 'string') {
      res.status(400).json({
        error:
          'inputAmountUi is required and must be a string representing the UI amount of AUDIO'
      })
      return
    }

    if (!outputMint || typeof outputMint !== 'string') {
      res.status(400).json({
        error: 'outputMint is required and must be a valid mint address'
      })
      return
    }

    // Validate outputMint is a valid public key
    let outputMintPubkey: PublicKey
    try {
      outputMintPubkey = new PublicKey(outputMint)
    } catch (e) {
      res.status(400).json({
        error: 'outputMint must be a valid Solana public key'
      })
      return
    }

    // Convert UI amount to big int version
    const audioAmountBN = new BN(
      Math.floor(parseFloat(inputAmountUi) * Math.pow(10, AUDIO_DECIMALS))
    )

    if (audioAmountBN.lte(new BN(0))) {
      res.status(400).json({
        error: 'audioInputAmount must be greater than 0'
      })
      return
    }
    // Inputs are all validated now 👍

    // Initialize Solana connection and DBC client
    const connection = getConnection()
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

    // Get the pool using the output mint as the base mint
    const virtualPoolAccount =
      await dbcClient.state.getPoolByBaseMint(outputMintPubkey)

    if (!virtualPoolAccount) {
      res.status(404).json({
        error: `DBC pool not found for mint: ${outputMint}`
      })
      return
    }

    // Extract the actual pool data
    const dbcPool = await dbcClient.state.getPoolByBaseMint(outputMintPubkey)
    if (!dbcPool) {
      res.status(404).json({
        error: `DBC pool not found for mint: ${outputMint}`
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
    // swapBaseForQuote: false means we're swapping quote (AUDIO) for base (artist token)
    const quote = await dbcClient.pool.swapQuote({
      virtualPool: dbcPool.account,
      config: poolConfig,
      swapBaseForQuote: false,
      amountIn: audioAmountBN,
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
