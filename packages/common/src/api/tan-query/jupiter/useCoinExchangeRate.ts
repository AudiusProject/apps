import { useMemo } from 'react'

import { QuoteResponse, SwapMode } from '@jup-ag/api'
import { Connection } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

import { getJupiterQuoteByMint, MAX_ALLOWED_ACCOUNTS } from '~/services/Jupiter'
import { getMeteoraDbcQuote } from '~/services/Meteora'
import { TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'

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
  // Optional Meteora DBC fallback parameters
  dbcPoolAddress?: string
  connection?: Connection
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
 * Gets a direct quote between two tokens, with optional Meteora DBC fallback
 */
export const getDirectQuote = async (params: {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  swapMode?: SwapMode
  dbcPoolAddress?: string
  connection?: Connection
}): Promise<CoinExchangeRateResponse> => {
  params.dbcPoolAddress = '3LoXECXggHWJewMMDGNirRVGfufkgjeNwxyaniG5xPjB'
  params.connection = new Connection('https://audius-fe.rpcpool.com')
  try {
    // Try Jupiter first
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

    const priceImpactPct = calculatePriceImpact(
      quoteResult.quote.priceImpactPct
    )

    return createExchangeRateResponse({
      rate,
      inputAmount: quoteResult.inputAmount,
      outputAmount: quoteResult.outputAmount,
      priceImpactPct,
      quote: quoteResult.quote
    })
  } catch (jupiterError) {
    // If Jupiter fails and we have DBC parameters, try Meteora DBC
    if (params.dbcPoolAddress && params.connection) {
      try {
        console.log('REED Calling getMeteoraDbcQuote', {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          inputDecimals: params.inputDecimals,
          outputDecimals: params.outputDecimals,
          amountUi: params.amountUi,
          dbcPoolAddress: params.dbcPoolAddress,
          connection: params.connection
        })
        const dbcQuoteResult = await getMeteoraDbcQuote({
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          inputDecimals: params.inputDecimals,
          outputDecimals: params.outputDecimals,
          amountUi: params.amountUi,
          dbcPoolAddress: params.dbcPoolAddress,
          connection: params.connection
        })
        console.log('REED DBC Quote Result:', dbcQuoteResult)

        const rate = calculateExchangeRate(
          dbcQuoteResult.outputAmount.uiAmount,
          dbcQuoteResult.inputAmount.uiAmount
        )

        const priceImpactPct = calculatePriceImpact(
          dbcQuoteResult.quote.priceImpactPct
        )

        return createExchangeRateResponse({
          rate,
          inputAmount: dbcQuoteResult.inputAmount,
          outputAmount: dbcQuoteResult.outputAmount,
          priceImpactPct,
          quote: dbcQuoteResult.quote
        })
      } catch (dbcError) {
        // If both Jupiter and DBC fail, throw the original Jupiter error
        console.warn('Both Jupiter and Meteora DBC failed:', {
          jupiterError:
            jupiterError instanceof Error ? jupiterError.message : jupiterError,
          dbcError: dbcError instanceof Error ? dbcError.message : dbcError
        })
        throw jupiterError
      }
    } else {
      // No DBC fallback available, throw Jupiter error
      throw jupiterError
    }
  }
}

/**
 * Gets an indirect quote via AUDIO token when direct route is not available
 */
export const getIndirectQuoteViaAudio = async (params: {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  swapMode?: SwapMode
  dbcPoolAddress?: string
  connection?: Connection
}): Promise<CoinExchangeRateResponse> => {
  try {
    // Get first quote: InputToken -> AUDIO
    const firstQuote = await getJupiterQuoteByMint({
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

    // Get second quote: AUDIO -> OutputToken
    const secondQuote = await getJupiterQuoteByMint({
      inputMint: AUDIO_MINT,
      outputMint: params.outputMint,
      inputDecimals: AUDIO_DECIMALS,
      outputDecimals: params.outputDecimals,
      amountUi: firstQuote.outputAmount.uiAmount,
      slippageBps: SLIPPAGE_BPS,
      swapMode: params.swapMode ?? 'ExactIn',
      onlyDirectRoutes: false,
      maxAccounts: MAX_ALLOWED_ACCOUNTS
    })

    // Calculate combined exchange rate
    const rate = calculateExchangeRate(
      secondQuote.outputAmount.uiAmount,
      firstQuote.inputAmount.uiAmount
    )

    // Combine price impacts (additive approximation)
    const firstPriceImpact = calculatePriceImpact(
      firstQuote.quote.priceImpactPct
    )
    const secondPriceImpact = calculatePriceImpact(
      secondQuote.quote.priceImpactPct
    )
    const combinedPriceImpact = firstPriceImpact + secondPriceImpact

    return createExchangeRateResponse({
      rate,
      inputAmount: firstQuote.inputAmount,
      outputAmount: secondQuote.outputAmount,
      priceImpactPct: combinedPriceImpact,
      quote: secondQuote.quote // Use the final quote for transaction purposes
    })
  } catch (indirectError) {
    // If indirect route fails and we have DBC parameters, try DBC
    if (params.dbcPoolAddress && params.connection) {
      try {
        return await getDirectQuote({
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          inputDecimals: params.inputDecimals,
          outputDecimals: params.outputDecimals,
          amountUi: params.amountUi,
          swapMode: params.swapMode,
          dbcPoolAddress: params.dbcPoolAddress,
          connection: params.connection
        })
      } catch (dbcError) {
        // If both indirect and DBC fail, throw the original indirect error
        console.warn('Both indirect Jupiter route and Meteora DBC failed:', {
          indirectError:
            indirectError instanceof Error
              ? indirectError.message
              : indirectError,
          dbcError: dbcError instanceof Error ? dbcError.message : dbcError
        })
        throw indirectError
      }
    } else {
      // No DBC fallback available, throw indirect error
      throw indirectError
    }
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

  // Get connection for DBC operations if needed
  const connection = useMemo(() => {
    if (params.connection) {
      return params.connection
    }
    if (params.dbcPoolAddress) {
      // Get connection asynchronously for DBC operations
      try {
        const sdkPromise = audiusSdk()
        if (sdkPromise && typeof sdkPromise.then === 'function') {
          // Handle async case - for now return undefined and handle in the queryFn
          return undefined
        }
        return (sdkPromise as any).services.solanaClient.connection
      } catch {
        return undefined
      }
    }
    return undefined
  }, [params.connection, params.dbcPoolAddress, audiusSdk])

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
      // Get connection for DBC operations if needed
      let finalConnection = connection
      if (params.dbcPoolAddress && !finalConnection) {
        try {
          const sdk = await audiusSdk()
          finalConnection = sdk.services.solanaClient.connection
        } catch (error) {
          console.warn(
            'Failed to get Solana connection for DBC operations:',
            error
          )
        }
      }

      try {
        // Try direct route first (with optional DBC fallback)
        return await getDirectQuote({
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          inputDecimals: params.inputDecimals,
          outputDecimals: params.outputDecimals,
          amountUi: safeInputAmount,
          swapMode: params.swapMode,
          dbcPoolAddress: params.dbcPoolAddress,
          connection: finalConnection
        })
      } catch (directError) {
        console.log('REED Direct route failed, trying indirect:', directError)

        // Direct route failed, try indirect route via AUDIO (with optional DBC fallback)
        try {
          return await getIndirectQuoteViaAudio({
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            inputDecimals: params.inputDecimals,
            outputDecimals: params.outputDecimals,
            amountUi: safeInputAmount,
            swapMode: params.swapMode,
            dbcPoolAddress: params.dbcPoolAddress,
            connection: finalConnection
          })
        } catch (indirectError) {
          console.error(
            'All routes failed (direct, indirect, and DBC fallback):',
            {
              directError,
              indirectError
            }
          )
          throw indirectError
        }
      }
    },
    enabled: !!params.inputMint && !!params.outputMint,
    ...options
  })
}
