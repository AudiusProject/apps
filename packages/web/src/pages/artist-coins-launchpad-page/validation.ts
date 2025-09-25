import { useMemo } from 'react'

import {
  QUERY_KEYS,
  QueryContextType,
  fetchCoinTickerAvailability,
  useQueryContext,
  useConnectedWallets,
  useWalletAudioBalance
} from '@audius/common/api'
import { Chain } from '@audius/common/models'
import { MAX_HANDLE_LENGTH } from '@audius/common/services'
import { AUDIO } from '@audius/fixed-decimal'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { useLaunchpadConfig } from 'hooks/useLaunchpadConfig'

import { getLatestConnectedWallet } from './utils'

export const FIELDS = {
  coinName: 'coinName',
  coinSymbol: 'coinSymbol',
  coinImage: 'coinImage',
  payAmount: 'payAmount',
  receiveAmount: 'receiveAmount',
  usdcValue: 'usdcValue',
  wantsToBuy: 'wantsToBuy'
}

const MAX_COIN_SYMBOL_LENGTH = 10

export const coinSymbolErrorMessages = {
  badCharacterError: 'Please only use letters and numbers',
  symbolTooLong: 'Coin symbol is too long (max 10 characters)',
  missingSymbolError: 'Please enter a coin symbol',
  tickerTakenError: 'Symbol unavailable.',
  unknownError: 'An unknown error occurred.'
}

const coinSymbolSchema = z.object({
  coinSymbol: z
    .string({ required_error: coinSymbolErrorMessages.missingSymbolError })
    .max(MAX_COIN_SYMBOL_LENGTH, coinSymbolErrorMessages.symbolTooLong)
    .regex(/^[A-Za-z0-9]*$/, coinSymbolErrorMessages.badCharacterError)
    .min(1, coinSymbolErrorMessages.missingSymbolError)
})

export const coinNameErrorMessages = {
  nameTooLong: 'Coin name is too long (max 30 characters)',
  missingNameError: 'Please enter a coin name'
}

export const coinImageErrorMessages = {
  missingImageError: 'Please select a coin image'
}

const coinNameSchema = z.object({
  coinName: z
    .string({ required_error: coinNameErrorMessages.missingNameError })
    .max(MAX_HANDLE_LENGTH, coinNameErrorMessages.nameTooLong)
    .min(1, coinNameErrorMessages.missingNameError)
})

const coinImageSchema = z.object({
  coinImage: z
    .union([z.null(), z.instanceof(File), z.instanceof(Blob)])
    .refine((file) => file !== null, coinImageErrorMessages.missingImageError)
})

export const firstBuyMessages = {
  insufficientBalance: 'Insufficient AUDIO balance',
  maxAudioError: (payAmountMax: number) =>
    `The max AUDIO amount is ${payAmountMax.toLocaleString()}`,
  maxTokenError: (receiveAmountMax: number) =>
    `The max available is ${receiveAmountMax.toLocaleString()}`
}

export const setupFormSchema = ({
  walletMax,
  payAmountMax = Infinity,
  receiveAmountMax = Infinity,
  queryContext,
  queryClient
}: {
  walletMax: number
  payAmountMax?: number
  receiveAmountMax?: number
  queryContext: QueryContextType
  queryClient: QueryClient
}) =>
  z
    .object({
      [FIELDS.coinName]: coinNameSchema.shape.coinName,
      [FIELDS.coinSymbol]: coinSymbolSchema.shape.coinSymbol.superRefine(
        async (ticker, context) => {
          // Only validate if ticker has at least 2 characters and passes basic format validation
          if (ticker && ticker.length >= 2) {
            try {
              const result = await queryClient.fetchQuery({
                queryKey: [QUERY_KEYS.coinByTicker, ticker],
                queryFn: async () =>
                  await fetchCoinTickerAvailability(ticker, queryContext)
              })
              const isAvailable = result.available

              if (!isAvailable) {
                context.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: coinSymbolErrorMessages.tickerTakenError,
                  fatal: true
                })
                return z.NEVER
              }
            } catch (error: any) {
              // Log the error for debugging
              console.error('Ticker validation error:', error)
              // For other errors, show unknown error
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: coinSymbolErrorMessages.unknownError
              })
              return z.NEVER
            }
          }
          return z.NEVER
        }
      ),
      [FIELDS.coinImage]: coinImageSchema.shape.coinImage,
      [FIELDS.wantsToBuy]: z.enum(['yes', 'no'], {
        required_error: 'Please select an option'
      }),
      [FIELDS.payAmount]: z.string().optional(),
      [FIELDS.receiveAmount]: z.string().optional()
    })
    .superRefine((values, context) => {
      // Only validate buy fields if user wants to buy
      if (values.wantsToBuy === 'yes') {
        // Validate payAmount
        if (
          values.payAmount &&
          values.payAmount !== '' &&
          typeof values.payAmount === 'string'
        ) {
          const payAmountNumber = parseFloat(values.payAmount.replace(/,/g, ''))
          if (payAmountNumber > walletMax) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: firstBuyMessages.insufficientBalance,
              path: [FIELDS.payAmount]
            })
          }
          if (payAmountNumber > payAmountMax) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: firstBuyMessages.maxAudioError(payAmountMax),
              path: [FIELDS.payAmount]
            })
          }
        }

        // Validate receiveAmount
        if (
          values.receiveAmount &&
          values.receiveAmount !== '' &&
          typeof values.receiveAmount === 'string'
        ) {
          const receiveAmountNumber = parseFloat(
            values.receiveAmount.replace(/,/g, '')
          )
          if (receiveAmountNumber > receiveAmountMax) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: firstBuyMessages.maxTokenError(receiveAmountMax),
              path: [FIELDS.receiveAmount]
            })
          }
        }
      }
    })

export const useLaunchpadFormSchema = () => {
  const queryClient = useQueryClient()
  const queryContext = useQueryContext()
  const { data: connectedWallets } = useConnectedWallets()
  const { data: firstBuyQuoteData } = useLaunchpadConfig()

  const { maxAudioInputAmount, maxTokenOutputAmount } = useMemo(() => {
    if (!firstBuyQuoteData) {
      return {
        maxAudioInputAmount: Infinity,
        maxTokenOutputAmount: Infinity
      }
    }
    return firstBuyQuoteData
  }, [firstBuyQuoteData])

  const connectedWallet = useMemo(
    () => getLatestConnectedWallet(connectedWallets),
    [connectedWallets]
  )
  const { data: audioBalance } = useWalletAudioBalance({
    address: connectedWallet?.address ?? '',
    chain: connectedWallet?.chain ?? Chain.Sol
  })
  const { audioBalanceNumber } = useMemo(() => {
    if (!audioBalance) {
      return { audioBalanceString: '0.00', audioBalanceNumber: 0 }
    }
    return {
      audioBalanceString: AUDIO(audioBalance).toLocaleString('en-US', {
        maximumFractionDigits: 2,
        roundingMode: 'trunc'
      }),
      audioBalanceNumber: Number(AUDIO(audioBalance).toFixed(2))
    }
  }, [audioBalance])

  return useMemo(() => {
    return {
      validationSchema: toFormikValidationSchema(
        setupFormSchema({
          walletMax: audioBalanceNumber,
          payAmountMax: Math.ceil(maxAudioInputAmount),
          receiveAmountMax: Math.floor(maxTokenOutputAmount), // Floor here because the value is something like 250,000,000.0000970
          queryContext,
          queryClient
        })
      ),
      maxPayAmount: Math.ceil(maxAudioInputAmount),
      maxReceiveAmount: Math.floor(maxTokenOutputAmount)
    }
  }, [
    audioBalanceNumber,
    maxAudioInputAmount,
    maxTokenOutputAmount,
    queryClient,
    queryContext
  ])
}
