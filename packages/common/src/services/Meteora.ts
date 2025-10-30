import { QuoteResponse } from '@jup-ag/api'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  DynamicBondingCurveClient,
  VirtualPool
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import BN from 'bn.js'

import { convertBigIntToAmountObject } from '~/utils'

export type MeteoraQuoteResult = {
  inputAmount: {
    amount: number
    amountString: string
    uiAmount: number
    uiAmountString: string
  }
  outputAmount: {
    amount: number
    amountString: string
    uiAmount: number
    uiAmountString: string
  }
  otherAmountThreshold: {
    amount: number
    amountString: string
    uiAmount: number
    uiAmountString: string
  }
  quote: QuoteResponse
}

/**
 * Gets a quote from Meteora DBC pool
 */
/**
 * Test utility to verify Meteora fallback is working
 */
export const testMeteoraFallback = async (params: {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  dbcPoolAddress: string
  connection: Connection
}) => {
  console.log('🧪 Testing Meteora DBC fallback...', params)

  try {
    const result = await getMeteoraDbcQuote(params)
    console.log('✅ Meteora DBC quote successful:', {
      inputAmount: result.inputAmount.uiAmount,
      outputAmount: result.outputAmount.uiAmount,
      rate: result.outputAmount.uiAmount / result.inputAmount.uiAmount
    })
    return result
  } catch (error) {
    console.error('❌ Meteora DBC quote failed:', error)
    throw error
  }
}

export const getMeteoraDbcQuote = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  dbcPoolAddress,
  connection
}: {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  dbcPoolAddress: string
  connection: Connection
}): Promise<MeteoraQuoteResult> => {
  const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')

  // Get pool state and config
  const poolState = await dbcClient.state.getPool(new PublicKey(dbcPoolAddress))
  if (!poolState) {
    throw new Error(`DBC pool not found: ${dbcPoolAddress}`)
  }

  const poolConfig = await dbcClient.state.getPoolConfig(poolState.config)
  if (!poolConfig) {
    throw new Error(`DBC pool config not found for pool: ${dbcPoolAddress}`)
  }

  console.log('REED Pool State:', poolState)
  console.log('REED Pool Config:', poolConfig)

  // Assume AUDIO is the quote token and artist coin is base token
  const AUDIO_MINT = '9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM'
  const isBaseToQuote = inputMint !== AUDIO_MINT
  const isQuoteToBase = inputMint === AUDIO_MINT

  // Convert amount to lamports
  const amountLamports = new BN(
    Math.floor(amountUi * Math.pow(10, inputDecimals))
  )

  console.log(
    'REED Amount Lamports:',
    amountLamports.toString(),
    inputDecimals,
    outputDecimals
  )

  let quote
  if (isBaseToQuote) {
    // Base token to quote token (e.g., artist coin to AUDIO)
    quote = await dbcClient.pool.swapQuote({
      virtualPool: poolState,
      config: poolConfig,
      swapBaseForQuote: true,
      amountIn: amountLamports,
      hasReferral: false,
      currentPoint: new BN(0)
    })
  } else if (isQuoteToBase) {
    // Quote token to base token (e.g., AUDIO to artist coin)
    quote = await dbcClient.pool.swapQuote({
      virtualPool: poolState,
      config: poolConfig,
      swapBaseForQuote: false,
      amountIn: amountLamports,
      hasReferral: false,
      currentPoint: new BN(0)
    })
  } else {
    throw new Error('Invalid token pair for DBC pool')
  }

  console.log('REED Quote:', {
    quote,
    poolState,
    poolConfig,
    poolConfigQuoteMint: poolConfig.quoteMint.toString(),
    poolStateBaseMint: poolState.baseMint.toString()
  })

  // Convert to quote format
  const outputAmountLamports = quote.outputAmount.toString()
  const inputAmountLamports = amountLamports.toString()

  return {
    inputAmount: convertBigIntToAmountObject(
      BigInt(inputAmountLamports),
      inputDecimals
    ),
    outputAmount: convertBigIntToAmountObject(
      BigInt(outputAmountLamports),
      outputDecimals
    ),
    otherAmountThreshold: convertBigIntToAmountObject(
      BigInt(outputAmountLamports),
      outputDecimals
    ),
    quote: {
      inAmount: inputAmountLamports,
      outAmount: outputAmountLamports,
      priceImpactPct: '0',
      marketInfos: [],
      otherAmountThreshold: outputAmountLamports,
      swapMode: 'ExactIn',
      slippageBps: 50,
      platformFee: undefined,
      routePlan: [],
      inputMint,
      outputMint
    } as unknown as QuoteResponse
  }
}
