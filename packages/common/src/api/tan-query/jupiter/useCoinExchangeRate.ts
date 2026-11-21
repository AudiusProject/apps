import { useMemo } from 'react'

import { FixedDecimal } from '@audius/fixed-decimal'
import type { AudiusSdkWithServices } from '@audius/sdk'
import type { QuoteResponse, SwapMode } from '@jup-ag/api'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'

import type { JupiterQuoteResult } from '~/services/Jupiter'
import { TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'
import { convertBigIntToAmountObject } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryOptions, type QueryKey } from '../types'
import { useQueryContext } from '../utils/QueryContext'

import { getCoinPoolState, getIsDirectSwappable } from './utils'

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

export const SLIPPAGE_BPS = 200

const MAX_SAFE_EXCHANGE_RATE_AMOUNT = 1000000000000

export const calculateExchangeRate = (
  outputUiAmount: number,
  inputUiAmount: number
): number => {
  return outputUiAmount / inputUiAmount
}

export const calculatePriceImpact = (
  priceImpactPct?: number | string
): number => {
  return priceImpactPct !== undefined ? Number(priceImpactPct) : 0
}

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

export const getDirectQuote = async (
  params: {
    inputMint: string
    outputMint: string
    inputDecimals: number
    outputDecimals: number
    amountUi: number
    swapMode?: SwapMode
  },
  queryClient: QueryClient,
  sdk: AudiusSdkWithServices
): Promise<CoinExchangeRateResponse> => {
  const { hasPool: inputHasPool } = getCoinPoolState(
    params.inputMint,
    queryClient
  )
  const { hasPool: outputHasPool } = getCoinPoolState(
    params.outputMint,
    queryClient
  )
  let quoteResult: JupiterQuoteResult | undefined
  if (inputHasPool || outputHasPool) {
    quoteResult = await getQuoteViaMeteoraDBC(params, sdk)
  } else {
    const { getJupiterQuoteByMint, MAX_ALLOWED_ACCOUNTS } = await import(
      '~/services/Jupiter'
    )
    quoteResult = await getJupiterQuoteByMint({
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
  }

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

export const getIndirectQuoteViaAudio = async (
  params: {
    inputMint: string
    outputMint: string
    inputDecimals: number
    outputDecimals: number
    amountUi: number
    swapMode?: SwapMode
  },
  queryClient: QueryClient,
  sdk: AudiusSdkWithServices
): Promise<CoinExchangeRateResponse> => {
  const { hasPool: inputHasPool } = getCoinPoolState(
    params.inputMint,
    queryClient
  )
  const { hasPool: outputHasPool } = getCoinPoolState(
    params.outputMint,
    queryClient
  )
  let firstQuote: JupiterQuoteResult | undefined
  if (inputHasPool) {
    firstQuote = await getQuoteViaMeteoraDBC(
      {
        inputMint: params.inputMint,
        outputMint: AUDIO_MINT,
        inputDecimals: params.inputDecimals,
        outputDecimals: AUDIO_DECIMALS,
        amountUi: params.amountUi,
        swapMode: params.swapMode ?? 'ExactIn'
      },
      sdk
    )
  } else {
    const { getJupiterQuoteByMint, MAX_ALLOWED_ACCOUNTS } = await import(
      '~/services/Jupiter'
    )
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

  let secondQuote: JupiterQuoteResult | undefined

  if (outputHasPool) {
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
  } else {
    const { getJupiterQuoteByMint, MAX_ALLOWED_ACCOUNTS } = await import(
      '~/services/Jupiter'
    )
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
  }

  const rate = calculateExchangeRate(
    secondQuote?.outputAmount?.uiAmount ?? params.amountUi,
    firstQuote?.inputAmount?.uiAmount ?? params.amountUi
  )

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
    quote: secondQuote?.quote ?? firstQuote!.quote
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
  sdk: AudiusSdkWithServices
): Promise<JupiterQuoteResult> => {
  const { inputMint, outputMint, inputDecimals, outputDecimals, amountUi } =
    params

  const direction = inputMint === AUDIO_MINT ? 'audioToCoin' : 'coinToAudio'
  const coinMint = inputMint === AUDIO_MINT ? outputMint : inputMint

  const { outputAmount } = await sdk.services.solanaRelay.getSwapCoinQuote({
    inputAmount: new FixedDecimal(amountUi, inputDecimals).value.toString(),
    coinMint,
    swapDirection: direction
  })

  const outputAmountBigInt = BigInt(outputAmount)

  const inputAmountBigInt = BigInt(
    new FixedDecimal(amountUi, inputDecimals).value.toString()
  )

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

export const useCoinExchangeRate = (
  params: CoinExchangeRateParams,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const inputAmount = params.inputAmount ?? 1

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
      const sdk = await audiusSdk()
      const isDirectSwap = getIsDirectSwappable(
        params.inputMint,
        params.outputMint
      )
      if (isDirectSwap) {
        return await getDirectQuote(
          {
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            inputDecimals: params.inputDecimals,
            outputDecimals: params.outputDecimals,
            amountUi: safeInputAmount,
            swapMode: params.swapMode
          },
          queryClient,
          sdk
        )
      } else {
        return await getIndirectQuoteViaAudio(
          {
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            inputDecimals: params.inputDecimals,
            outputDecimals: params.outputDecimals,
            amountUi: safeInputAmount,
            swapMode: params.swapMode
          },
          queryClient,
          sdk
        )
      }
    },
    ...options,
    enabled:
      !!params.inputMint && !!params.outputMint && options?.enabled !== false
  })
}
