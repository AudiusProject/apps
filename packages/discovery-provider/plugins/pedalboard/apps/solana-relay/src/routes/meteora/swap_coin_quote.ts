import { CpAmm } from '@meteora-ag/cp-amm-sdk'
import {
  DynamicBondingCurveClient,
  SwapMode
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { initializeDiscoveryDb } from '@pedalboard/basekit'
import {
  SolMeteoraDammV2Pools,
  SolMeteoraDbcPools,
  Table
} from '@pedalboard/storage'
import { getMint } from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { NextFunction, Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'
import { AUDIO_MINT } from '../launchpad/constants'

import { SWAP_SLIPPAGE_BPS } from './constants'

const db = initializeDiscoveryDb(config.discoveryDbConnectionString)

const getDBCPoolQuote = async (
  dbcPool: SolMeteoraDbcPools,
  connection: Connection,
  inputAmountBN: BN,
  coinMintPubkey: PublicKey,
  swapDirection: string
) => {
  const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

  if (!dbcPool || !dbcPool.account) {
    throw new Error(
      `No DBC pool found in db for coin mint: ${coinMintPubkey.toString()}`
    )
  }

  const virtualPoolState = await dbcClient.state.getPool(
    new PublicKey(dbcPool.account)
  )

  if (!virtualPoolState) {
    throw new Error(
      `Unable to get DBC pool state from Meteora. Pool address: ${dbcPool.account}`
    )
  }

  // Convert snake_case keys to camelCase for SDK compatibility
  const poolConfig = await dbcClient.state.getPoolConfig(dbcPool.config)
  if (!poolConfig) {
    throw new Error(
      `Unable to get DBC pool config from Meteora. Pool address: ${dbcPool.account}`
    )
  }
  const currentPoint = await connection.getSlot()

  // Get swap quote using swapQuote2 with PartialFill mode for consistent behavior
  const quote = dbcClient.pool.swapQuote2({
    virtualPool: virtualPoolState,
    config: poolConfig,
    swapBaseForQuote: swapDirection === 'coinToAudio', // Base = coin, quote = audio
    hasReferral: false,
    currentPoint: new BN(currentPoint),
    slippageBps: SWAP_SLIPPAGE_BPS, // 2% slippage tolerance for partial fills
    swapMode: SwapMode.PartialFill,
    amountIn: inputAmountBN
  })
  return quote.outputAmount.toString()
}

const getDammPoolQuote = async (
  dammPoolRecord: SolMeteoraDammV2Pools,
  connection: Connection,
  inputAmountBN: BN,
  coinMintPubkey: PublicKey,
  swapDirection: string
) => {
  const cpAmm = new CpAmm(connection)
  const poolState = await cpAmm.fetchPoolState(
    new PublicKey(dammPoolRecord.account)
  )
  if (!poolState) {
    throw new Error(
      `Unable to fetch damm pool state from Meteora. Pool address: ${dammPoolRecord.account}`
    )
  }

  // Fetch token mint information to get decimals
  const tokenAMintInfo = await getMint(connection, poolState.tokenAMint)
  const tokenBMintInfo = await getMint(connection, poolState.tokenBMint)

  const currentEpoch = (await connection.getEpochInfo()).epoch
  const audioMintPubkey = new PublicKey(AUDIO_MINT)
  const inputTokenMint =
    swapDirection === 'audioToCoin' ? audioMintPubkey : coinMintPubkey

  const quote = await cpAmm.getQuote({
    inAmount: inputAmountBN,
    inputTokenMint,
    slippage: 2,
    poolState,
    currentTime: new Date().getTime(),
    currentSlot: await connection.getSlot(),
    inputTokenInfo: {
      mint: tokenAMintInfo,
      currentEpoch
    },
    outputTokenInfo: {
      mint: tokenBMintInfo,
      currentEpoch
    },
    tokenADecimal: tokenAMintInfo.decimals,
    tokenBDecimal: tokenBMintInfo.decimals
  })

  return quote.swapOutAmount.toString()
}
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
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { inputAmount, coinMint, swapDirection } = req.query

    // Validate required parameters
    if (!inputAmount || typeof inputAmount !== 'string') {
      res.status(400).json({
        error:
          'inputAmount is required and must be a string representing the big int number amount'
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

    // Find the pool using the coin's mint from the database
    const dbcPoolRecord = await db<SolMeteoraDbcPools>(Table.SolMeteoraDbcPools)
      .where('base_mint', coinMintPubkey.toString())
      .first()

    const dammPoolRecord = await db<SolMeteoraDammV2Pools>(
      Table.SolMeteoraDammV2Pools
    )
      .where('token_a_mint', coinMintPubkey.toString())
      .first()

    if (!dbcPoolRecord && !dammPoolRecord) {
      res.status(404).json({
        error: `No DBC or DAMM pool found for coin mint: ${coinMintPubkey.toString()}`
      })
      return
    }

    // Convert UI amount to bigint
    const inputAmountBN = new BN(inputAmount)

    if (inputAmountBN.lte(new BN(0))) {
      res.status(400).json({
        error: 'inputAmountUi must be greater than 0'
      })
      return
    }
    // Inputs are all validated now 👍

    // Initialize Solana connection and DBC client
    const connection = getConnection()

    // If a DAMM entry was found, its always a DAMM pool
    const isDamm = !!dammPoolRecord
    // If a DBC entry was found, we also have to ensure it's not supposed to be migrated
    const isDBC = !isDamm && dbcPoolRecord && !dbcPoolRecord.is_migrated
    let outputAmount: string | undefined
    try {
      if (isDBC) {
        outputAmount = await getDBCPoolQuote(
          dbcPoolRecord,
          connection,
          inputAmountBN,
          coinMintPubkey,
          swapDirection
        )
      }
      if (isDamm) {
        outputAmount = await getDammPoolQuote(
          dammPoolRecord,
          connection,
          inputAmountBN,
          coinMintPubkey,
          swapDirection
        )
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return
    }
    if (!isDBC && !isDamm) {
      res.status(404).json({
        error: `Unable to determine if a DBC or DAMM pool exists for coin mint: ${coinMintPubkey.toString()}`
      })
      return
    }

    // Return the output amount in bigint format
    res.status(200).json({
      outputAmount
    })
    next()
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: 'Failed to get coin swap quote',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
