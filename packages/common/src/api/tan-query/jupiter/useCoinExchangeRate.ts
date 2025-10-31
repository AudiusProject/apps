import { useMemo } from 'react'

import { FixedDecimal } from '@audius/fixed-decimal'
import type { AudiusSdk } from '@audius/sdk'
import { QuoteResponse, SwapMode } from '@jup-ag/api'
import { useQuery } from '@tanstack/react-query'

import {
  getJupiterQuoteByMint,
  JupiterQuoteResult,
  MAX_ALLOWED_ACCOUNTS
} from '~/services/Jupiter'
import { TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'
import { convertBigIntToAmountObject } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryOptions, type QueryKey } from '../types'
import { useQueryContext } from '../utils/QueryContext'

// AUDIO mint address for use as intermediary token in double swaps
const AUDIO_MINT = TOKEN_LISTING_MAP.AUDIO.address
const AUDIO_DECIMALS = TOKEN_LISTING_MAP.AUDIO.decimals

export type CoinExchangeRateParams = {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  inputAmount?: number
  swapMode?: SwapMode
}

export type CoinExchangeRateResponse = {
  rate: number
  inputAmount: {
    amount: number
    uiAmount: number
  }
  outputAmount: {
    amount: number
    uiAmount: number
  }
  priceImpactPct: number
  quote: QuoteResponse
}

// Default slippage is 50 basis points (0.5%)
export const SLIPPAGE_BPS = 50

// Maximum safe amount for exchange rate queries to prevent API errors
// This corresponds to 1 trillion tokens, which is well above any realistic amount
const MAX_SAFE_EXCHANGE_RATE_AMOUNT = 1000000000000

/**
 * Calculates the exchange rate between two amounts
 */
export const calculateExchangeRate = (
  outputUiAmount: number,
  inputUiAmount: number
): number => {
  return outputUiAmount / inputUiAmount
}

/**
 * Calculates price impact percentage, handling undefined values
 */
export const calculatePriceImpact = (
  priceImpactPct?: number | string
): number => {
  return priceImpactPct !== undefined ? Number(priceImpactPct) : 0
}

/**
 * Creates a standardized CoinExchangeRateResponse object
 */
export const createExchangeRateResponse = ({
  rate,
  inputAmount,
  outputAmount,
  priceImpactPct,
  quote
}: {
  rate: number
  inputAmount: { amount: number; uiAmount: number }
  outputAmount: { amount: number; uiAmount: number }
  priceImpactPct: number
  quote: QuoteResponse
}): CoinExchangeRateResponse => {
  return {
    rate,
    inputAmount: {
      amount: inputAmount.amount,
      uiAmount: inputAmount.uiAmount
    },
    outputAmount: {
      amount: outputAmount.amount,
      uiAmount: outputAmount.uiAmount
    },
    priceImpactPct,
    quote
  }
}

/**
 * Gets a direct quote between two tokens
 */
export const getDirectQuote = async (params: {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  swapMode?: SwapMode
}): Promise<CoinExchangeRateResponse> => {
  const quoteResult = await getJupiterQuoteByMint({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inputDecimals: params.inputDecimals,
    outputDecimals: params.outputDecimals,
    amountUi: params.amountUi,
    slippageBps: SLIPPAGE_BPS,
    swapMode: params.swapMode ?? 'ExactIn',
    onlyDirectRoutes: false,
    maxAccounts: MAX_ALLOWED_ACCOUNTS
  })

  const rate = calculateExchangeRate(
    quoteResult.outputAmount.uiAmount,
    quoteResult.inputAmount.uiAmount
  )

  const priceImpactPct = calculatePriceImpact(quoteResult.quote.priceImpactPct)

  return createExchangeRateResponse({
    rate,
    inputAmount: quoteResult.inputAmount,
    outputAmount: quoteResult.outputAmount,
    priceImpactPct,
    quote: quoteResult.quote
  })
}

/**
 * Gets an indirect quote via AUDIO token when direct route is not available
 */
export const getIndirectQuoteViaAudio = async (
  params: {
    inputMint: string
    outputMint: string
    inputDecimals: number
    outputDecimals: number
    amountUi: number
    swapMode?: SwapMode
  },
  sdk: AudiusSdk
): Promise<CoinExchangeRateResponse> => {
  // Get first quote: InputToken -> AUDIO
  let firstQuote: JupiterQuoteResult | undefined
  // Note: if the input mint is already audio, we don't need to get a quote for it
  if (params.inputMint !== AUDIO_MINT) {
    firstQuote = await getJupiterQuoteByMint({
      inputMint: params.inputMint,
      outputMint: AUDIO_MINT,
      inputDecimals: params.inputDecimals,
      outputDecimals: AUDIO_DECIMALS,
      amountUi: params.amountUi,
      slippageBps: SLIPPAGE_BPS,
      swapMode: params.swapMode ?? 'ExactIn',
      onlyDirectRoutes: false,
      maxAccounts: MAX_ALLOWED_ACCOUNTS
    })
  }

  // Get second quote: AUDIO -> OutputToken
  let secondQuote: JupiterQuoteResult | undefined
  // If the output mint is already audio, we don't need to get a quote for it
  if (params.outputMint !== AUDIO_MINT) {
    try {
      secondQuote = await getJupiterQuoteByMint({
        inputMint: AUDIO_MINT,
        outputMint: params.outputMint,
        inputDecimals: AUDIO_DECIMALS,
        outputDecimals: params.outputDecimals,
        amountUi: firstQuote?.outputAmount?.uiAmount ?? params.amountUi,
        slippageBps: SLIPPAGE_BPS,
        swapMode: params.swapMode ?? 'ExactIn',
        onlyDirectRoutes: false,
        maxAccounts: MAX_ALLOWED_ACCOUNTS
      })
    } catch (error) {
      secondQuote = await getQuoteViaMeteoraDBC(
        {
          inputMint: AUDIO_MINT,
          outputMint: params.outputMint,
          inputDecimals: AUDIO_DECIMALS,
          outputDecimals: params.outputDecimals,
          amountUi: firstQuote?.outputAmount?.uiAmount ?? params.amountUi,
          swapMode: params.swapMode ?? 'ExactIn'
        },
        sdk
      )
    }
  }

  // Calculate combined exchange rate

  const rate = calculateExchangeRate(
    secondQuote?.outputAmount?.uiAmount ?? params.amountUi,
    firstQuote?.inputAmount?.uiAmount ?? params.amountUi
  )

  // Combine price impacts (additive approximation)
  const firstPriceImpact = calculatePriceImpact(
    firstQuote?.quote?.priceImpactPct ?? 0
  )
  const secondPriceImpact = calculatePriceImpact(
    secondQuote?.quote?.priceImpactPct ?? 0
  )
  const combinedPriceImpact = firstPriceImpact + secondPriceImpact

  return createExchangeRateResponse({
    rate,
    inputAmount: firstQuote?.inputAmount ?? secondQuote!.inputAmount,
    outputAmount: secondQuote?.outputAmount ?? firstQuote!.outputAmount,
    priceImpactPct: combinedPriceImpact,
    quote: secondQuote?.quote ?? firstQuote!.quote // Use the final quote for transaction purposes
  })
}

export const getQuoteViaMeteoraDBC = async (
  params: {
    inputMint: string
    outputMint: string
    inputDecimals: number
    outputDecimals: number
    amountUi: number
    swapMode?: SwapMode
  },
  sdk: AudiusSdk
): Promise<JupiterQuoteResult> => {
  const { inputMint, outputMint, inputDecimals, outputDecimals, amountUi } =
    params

  // Get the quote from Meteora DBC via the solana relay
  const { outputAmount } = await sdk.services.solanaRelay.getSwapCoinQuote({
    inputAmountUi: amountUi.toString(),
    outputMint
  })

  // Convert the output amount string to BigInt
  const outputAmountBigInt = BigInt(outputAmount)

  // Calculate input amount in lamports
  const inputAmountBigInt = BigInt(
    new FixedDecimal(amountUi, inputDecimals).value.toString()
  )

  // Create a mock QuoteResponse for compatibility with JupiterQuoteResult
  // Since Meteora DBC doesn't provide the same level of detail as Jupiter
  const mockQuote: QuoteResponse = {
    inputMint,
    inAmount: inputAmountBigInt.toString(),
    outputMint,
    outAmount: outputAmount,
    otherAmountThreshold: outputAmount,
    swapMode: params.swapMode ?? 'ExactIn',
    slippageBps: SLIPPAGE_BPS,
    platformFee: undefined,
    priceImpactPct: '0', // Meteora DBC doesn't provide price impact
    routePlan: [],
    contextSlot: 0,
    timeTaken: 0
  }

  return {
    inputAmount: convertBigIntToAmountObject(inputAmountBigInt, inputDecimals),
    outputAmount: convertBigIntToAmountObject(
      outputAmountBigInt,
      outputDecimals
    ),
    otherAmountThreshold: convertBigIntToAmountObject(
      outputAmountBigInt,
      outputDecimals
    ),
    quote: mockQuote
  }
}

// Define exchange rate query key
export const getCoinExchangeRateQueryKey = ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  inputAmount,
  swapMode
}: CoinExchangeRateParams) =>
  [
    QUERY_KEYS.tokenExchangeRate,
    inputMint,
    outputMint,
    inputDecimals,
    outputDecimals,
    inputAmount ?? 1,
    swapMode ?? 'ExactIn'
  ] as unknown as QueryKey<CoinExchangeRateResponse>

/**
 * Hook to get the exchange rate between two tokens using Jupiter
 *
 * @param params Parameters for the token exchange rate query
 * @param options Optional query configuration
 * @returns The exchange rate data
 */
export const useCoinExchangeRate = (
  params: CoinExchangeRateParams,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  // Default to 1 unit of input token if no amount specified
  const inputAmount = params.inputAmount ?? 1

  // Validate input amount to prevent API errors with extremely large numbers
  const safeInputAmount = useMemo(() => {
    if (inputAmount > MAX_SAFE_EXCHANGE_RATE_AMOUNT) {
      console.warn(
        'Exchange rate input amount too large, capping at safe limit:',
        inputAmount
      )
      return MAX_SAFE_EXCHANGE_RATE_AMOUNT
    }
    return inputAmount
  }, [inputAmount])

  return useQuery({
    queryKey: getCoinExchangeRateQueryKey({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      inputDecimals: params.inputDecimals,
      outputDecimals: params.outputDecimals,
      inputAmount: safeInputAmount,
      swapMode: params.swapMode
    }),
    queryFn: async () => {
      try {
        // Try direct route first
        return await getDirectQuote({
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          inputDecimals: params.inputDecimals,
          outputDecimals: params.outputDecimals,
          amountUi: safeInputAmount,
          swapMode: params.swapMode
        })
      } catch (directError) {
        // Direct route failed, try indirect route via AUDIO
        try {
          const sdk = await audiusSdk()
          return await getIndirectQuoteViaAudio(
            {
              inputMint: params.inputMint,
              outputMint: params.outputMint,
              inputDecimals: params.inputDecimals,
              outputDecimals: params.outputDecimals,
              amountUi: safeInputAmount,
              swapMode: params.swapMode
            },
            sdk
          )
        } catch (indirectError) {
          console.error('Both direct and indirect routes failed:', {
            directError,
            indirectError
          })
          throw indirectError
        }
      }
    },
    enabled: !!params.inputMint && !!params.outputMint,
    ...options
  })
}
