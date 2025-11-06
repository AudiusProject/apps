import { CpAmm } from '@meteora-ag/cp-amm-sdk'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { initializeDiscoveryDb } from '@pedalboard/basekit'
import {
  SolMeteoraDammV2Pools,
  SolMeteoraDbcPools,
  Table
} from '@pedalboard/storage'
import { getMint } from '@solana/spl-token'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'
import { AUDIO_MINT } from '../launchpad/constants'

const db = initializeDiscoveryDb(config.discoveryDbConnectionString)

const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
)

const getDBCSwapTx = async (
  connection: Connection,
  dbcPool: SolMeteoraDbcPools,
  coinMintPubkey: PublicKey,
  swapDirection: string,
  inputAmountBN: BN,
  userPubkey: PublicKey,
  feePayerPubkey: PublicKey
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

  // Get swap quote
  const swapQuote = await dbcClient.pool.swapQuote({
    virtualPool: virtualPoolState,
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
    pool: new PublicKey(dbcPool.account),
    referralTokenAccount: null,
    payer: feePayerPubkey
  })
  return { swapTx, outputAmount: swapQuote.outputAmount.toString() }
}

const getDammSwapTx = async (
  connection: Connection,
  dammPoolRecord: SolMeteoraDammV2Pools,
  coinMintPubkey: PublicKey,
  swapDirection: string,
  inputAmountBN: BN,
  userPubkey: PublicKey
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
  const outputTokenMint =
    swapDirection === 'audioToCoin' ? coinMintPubkey : audioMintPubkey

  const quote = await cpAmm.getQuote({
    inAmount: inputAmountBN,
    inputTokenMint,
    slippage: 0.5,
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
  const swapTx = await cpAmm.swap({
    payer: userPubkey,
    pool: new PublicKey(dammPoolRecord.account),
    inputTokenMint,
    outputTokenMint,
    amountIn: inputAmountBN,
    minimumAmountOut: quote.minSwapOutAmount,
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAMint: poolState.tokenAMint,
    tokenBMint: poolState.tokenBMint,
    tokenAProgram: SPL_TOKEN_PROGRAM_ID,
    tokenBProgram: SPL_TOKEN_PROGRAM_ID,
    referralTokenAccount: null // we dont do any referral fees
  })
  return { swapTx, outputAmount: quote.swapOutAmount.toString() }
}

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
 * - feePayer: Optional fee payer separate from the user public key
 *
 * Returns:
 * - transaction: Base64-encoded serialized transaction ready to be signed by the user
 * - outputAmount: The expected output amount in bigint format (raw token amount)
 */
export const swapCoin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputAmount, coinMint, swapDirection, userPublicKey, feePayer } =
      req.query

    // Validate required parameters
    if (!inputAmount || typeof inputAmount !== 'string') {
      res.status(400).json({
        error:
          'inputAmount is required and must be a string representing the big int number amount of input token'
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

    if (feePayer && typeof feePayer !== 'string') {
      res.status(400).json({
        error: 'feePayer must be a valid public key'
      })
      return
    }

    // Validate public keys
    let coinMintPubkey: PublicKey
    let userPubkey: PublicKey
    let feePayerPubkey: PublicKey | undefined
    try {
      coinMintPubkey = new PublicKey(coinMint)
      userPubkey = new PublicKey(userPublicKey)
      if (feePayer) {
        feePayerPubkey = new PublicKey(feePayer)
      } else {
        feePayerPubkey = userPubkey
      }
    } catch (e) {
      res.status(400).json({
        error: 'outputMint and userPublicKey must be valid Solana public keys'
      })
      return
    }

    // Convert UI amount to bigint
    const inputAmountBN = new BN(inputAmount)

    if (inputAmountBN.lte(new BN(0))) {
      res.status(400).json({
        error: 'inputAmount must be greater than 0'
      })
      return
    }
    // Inputs are all validated now 👍

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

    // If a DAMM entry was found, its always a DAMM pool
    const isDamm = !!dammPoolRecord
    // If a DBC entry was found, we also have to ensure it's not supposed to be migrated
    const isDBC = !isDamm && dbcPoolRecord && !dbcPoolRecord.is_migrated

    // Initialize Solana connection and DBC client
    const connection = getConnection()

    let swapTx: Transaction | undefined
    let outputAmount: string | undefined
    if (isDBC) {
      const { swapTx: dbcSwapTx, outputAmount: dbcOutputAmount } =
        await getDBCSwapTx(
          connection,
          dbcPoolRecord,
          coinMintPubkey,
          swapDirection,
          inputAmountBN,
          userPubkey,
          feePayerPubkey
        )
      swapTx = dbcSwapTx
      outputAmount = dbcOutputAmount
    } else if (isDamm) {
      const { swapTx: dammSwapTx, outputAmount: dammOutputAmount } =
        await getDammSwapTx(
          connection,
          dammPoolRecord,
          coinMintPubkey,
          swapDirection,
          inputAmountBN,
          userPubkey
        )
      swapTx = dammSwapTx
      outputAmount = dammOutputAmount
    } else {
      res.status(500).json({
        error: `No DBC or DAMM pool found for coin mint: ${coinMintPubkey.toString()}`
      })
      return
    }
    if (!swapTx) {
      res.status(500).json({
        error: `Failed to create swap transaction for coin mint: ${coinMintPubkey.toString()}`
      })
      return
    }

    swapTx.feePayer = feePayerPubkey
    swapTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    // Serialize the transaction
    const serializedTx = Buffer.from(
      swapTx.serialize({ requireAllSignatures: false })
    ).toString('base64')

    // Return the transaction and expected output amount
    res.status(200).json({
      transaction: serializedTx,
      outputAmount
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: 'Failed to create coin swap transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
