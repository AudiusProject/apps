import { FirstBuyQuoteResponse } from '@audius/sdk'
import {
  createJupiterApiClient,
  QuoteResponse,
  SwapApi as JupiterApi
} from '@jup-ag/api'
import {
  DynamicBondingCurveClient,
  getBaseTokenForSwap,
  PoolConfig,
  SwapMode,
  VirtualPool
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { Keypair } from '@solana/web3.js'
import BN from 'bn.js'
import { Request, Response } from 'express'

import { config } from '../../config'
import { logger } from '../../logger'
import { getConnection } from '../../utils/connections'

import { AUDIO_MINT, USDC_MINT } from './constants'
import { makeCurve, makeTestCurve } from './curve'

/**
 * Gets a Jupiter swap quote to determine the USDC value of the given AUDIO amount
 */
const getAudioToUSDCQuote = async (
  jupiterApi: JupiterApi,
  audioAmount: string
): Promise<QuoteResponse> => {
  return await jupiterApi.quoteGet({
    inputMint: AUDIO_MINT,
    outputMint: USDC_MINT,
    amount: new BN(audioAmount).toNumber(),
    swapMode: 'ExactIn',
    onlyDirectRoutes: false,
    dynamicSlippage: true
  })
}

/**
 * Gets a quote for a buy off the bonding curve using the given pool config
 */
const getBondingCurveQuote = async ({
  dbcClient,
  audioAmount,
  tokenAmount,
  virtualPoolState,
  poolConfigState
}: {
  dbcClient: DynamicBondingCurveClient
  audioAmount?: BN
  tokenAmount?: BN
  virtualPoolState: VirtualPool
  poolConfigState: PoolConfig
}) => {
  if (audioAmount) {
    const quote = await dbcClient.pool.swapQuote({
      virtualPool: virtualPoolState,
      config: poolConfigState,
      swapBaseForQuote: false,
      amountIn: audioAmount,
      hasReferral: false,
      currentPoint: new BN(0)
    })
    return quote.outputAmount.toString()
  } else if (tokenAmount) {
    // Swap quote 2 has additional params that allows us to specify ExactOut for the swap
    const quote = await dbcClient.pool.swapQuote2({
      virtualPool: virtualPoolState,
      config: poolConfigState,
      swapBaseForQuote: false,
      swapMode: SwapMode.ExactOut,
      amountOut: tokenAmount,
      hasReferral: false,
      currentPoint: new BN(0)
    })

    return quote.maximumAmountIn?.toString()
  } else {
    throw new Error('audioAmount or tokenAmount is required')
  }
}

/**
 *  Gets a quote starting from exact AUDIO input amount
 */
const getQuoteFromAudioInput = async (
  jupiterApi: JupiterApi,
  dbcClient: DynamicBondingCurveClient,
  audioAmount: string,
  virtualPoolState: VirtualPool,
  poolConfigState: PoolConfig
) => {
  // Get AUDIO to USDC quote
  const audioToUsdcQuote = await getAudioToUSDCQuote(jupiterApi, audioAmount)

  // Use the AUDIO amount from the jupiter quote to get a quote for tokens out of the bonding curve
  const audioToTokensQuote = await getBondingCurveQuote({
    dbcClient,
    audioAmount: new BN(audioAmount),
    virtualPoolState,
    poolConfigState
  })
  return {
    usdcValue: audioToUsdcQuote.outAmount,
    audioInputAmount: audioAmount,
    tokenOutputAmount: audioToTokensQuote
  }
}

/**
 *  Gets a quote starting from exact token output amount
 */
const getQuoteFromTokenOutput = async (
  jupiterApi: JupiterApi,
  dbcClient: DynamicBondingCurveClient,
  tokenAmount: string,
  virtualPoolState: VirtualPool,
  poolConfigState: PoolConfig
) => {
  // Get AUDIO to TOKEN quote
  const audioAmount = await getBondingCurveQuote({
    dbcClient,
    tokenAmount: new BN(tokenAmount),
    virtualPoolState,
    poolConfigState
  })

  const usdcValue = await getAudioToUSDCQuote(jupiterApi, audioAmount!)

  return {
    usdcValue: usdcValue.outAmount,
    audioInputAmount: audioAmount,
    tokenOutputAmount: tokenAmount
  }
}

// Endpoint logic
export const firstBuyQuote = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { audioInputAmount, tokenOutputAmount } = req.query

    if (!audioInputAmount && !tokenOutputAmount) {
      res.status(400).json({
        error: 'audioInputAmount or tokenOutputAmount is required'
      })
      return
    }

    if (audioInputAmount && typeof audioInputAmount !== 'string') {
      res.status(400).json({
        error:
          'audioInputAmount is required and must be a string representing the amount in 8 digit waudio decimals'
      })
      return
    }

    if (tokenOutputAmount && typeof tokenOutputAmount !== 'string') {
      res.status(400).json({
        error:
          'tokenOutputAmount is required and must be a string representing the amount in standard 9 decimal format'
      })
      return
    }

    // Solana connections
    const connection = getConnection()
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed')
    const jupiterApi = createJupiterApiClient()
    const {
      virtualPoolState,
      poolConfigState,
      maxAudioInputAmount,
      maxTokenOutputAmount
    } = await getLaunchpadConfig()

    // Handle AUDIO -> token quote
    if (audioInputAmount && audioInputAmount) {
      const audioInputOrMax = new BN(audioInputAmount).gt(
        new BN(maxAudioInputAmount)
      )
        ? maxAudioInputAmount
        : audioInputAmount
      const quoteFromAudioData = await getQuoteFromAudioInput(
        jupiterApi,
        dbcClient,
        audioInputOrMax,
        virtualPoolState,
        poolConfigState
      )
      res.status(200).send({
        ...quoteFromAudioData,
        maxAudioInputAmount,
        maxTokenOutputAmount
      } as FirstBuyQuoteResponse)
    }

    // Handle token -> AUDIO quote
    if (tokenOutputAmount && tokenOutputAmount) {
      const quoteFromTokenData = await getQuoteFromTokenOutput(
        jupiterApi,
        dbcClient,
        tokenOutputAmount,
        virtualPoolState,
        poolConfigState
      )
      res.status(200).send({
        ...quoteFromTokenData,
        maxAudioInputAmount,
        maxTokenOutputAmount
      } as FirstBuyQuoteResponse)
    }
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: 'Failed to get first buy quote',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

const getLaunchpadConfig = async (): Promise<{
  virtualPoolState: VirtualPool
  poolConfigState: PoolConfig
  maxAudioInputAmount: string
  maxTokenOutputAmount: string
  sqrtStartPrice: BN
}> => {
  // Build a mock config and virtual pool entirely from our local curve design
  const dummy = Keypair.generate()
  const curve =
    config.environment === 'prod'
      ? makeCurve({
          payer: dummy,
          configKey: dummy,
          partner: dummy.publicKey,
          rewardPoolAuthority: dummy.publicKey
        })
      : makeTestCurve({
          payer: dummy,
          configKey: dummy,
          partner: dummy.publicKey,
          rewardPoolAuthority: dummy.publicKey
        })

  const migrationSqrtPrice = curve.curve[curve.curve.length - 1].sqrtPrice
  const swapBaseAmount = getBaseTokenForSwap(
    curve.sqrtStartPrice,
    migrationSqrtPrice,
    curve.curve
  )
  const poolConfigState = {
    quoteMint: curve.quoteMint,
    tokenDecimal: curve.tokenDecimal,
    sqrtStartPrice: curve.sqrtStartPrice,
    migrationQuoteThreshold: curve.migrationQuoteThreshold,
    collectFeeMode: curve.collectFeeMode,
    activationType: curve.activationType,
    tokenType: curve.tokenType,
    poolFees: {
      ...curve.poolFees,
      dynamicFee: curve.poolFees.dynamicFee ?? { initialized: false }
    },
    migrationOption: curve.migrationOption,
    migrationFeeOption: curve.migrationFeeOption,
    migratedPoolFee: curve.migratedPoolFee,
    migrationFee: curve.migrationFee,
    partnerLpPercentage: curve.partnerLpPercentage,
    creatorLpPercentage: curve.creatorLpPercentage,
    partnerLockedLpPercentage: curve.partnerLockedLpPercentage,
    creatorLockedLpPercentage: curve.creatorLockedLpPercentage,
    creatorTradingFeePercentage: curve.creatorTradingFeePercentage,
    curve: curve.curve,
    lockedVesting: curve.lockedVesting,
    padding: curve.padding,
    swapBaseAmount,
    migrationSqrtPrice
    // TODO: type this better but for now this is enough to get the math correct
  } as unknown as PoolConfig

  const virtualPoolState = {
    sqrtPrice: curve.sqrtStartPrice,
    quoteReserve: new BN(0),
    baseReserve: new BN(0),
    volatilityTracker: { volatilityAccumulator: new BN(0) },
    activationPoint: new BN(0)
  } as VirtualPool

  const maxAudioInputAmount = poolConfigState.migrationQuoteThreshold
    .muln(100)
    .divn(99)
    .toString()
  const maxTokenOutputAmount = poolConfigState.swapBaseAmount.toString()
  return {
    virtualPoolState,
    poolConfigState,
    maxAudioInputAmount,
    maxTokenOutputAmount,
    sqrtStartPrice: poolConfigState.sqrtStartPrice
  }
}

export const getLaunchpadConfigRoute = async (
  _: Request,
  res: Response
): Promise<void> => {
  try {
    const { maxAudioInputAmount, maxTokenOutputAmount } =
      await getLaunchpadConfig()

    res.status(200).send({
      maxAudioInputAmount,
      maxTokenOutputAmount
    })
  } catch (e) {
    res.status(500).send()
  }
}
