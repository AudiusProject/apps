import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Configuration,
  Instruction,
  QuoteResponse,
  SwapApi,
  SwapMode
} from '@jup-ag/api'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'

import { convertBigIntToAmountObject, removeNullable } from '~/utils'

export const DEFAULT_MAX_ACCOUNTS = 20
export const MAX_ALLOWED_ACCOUNTS = 64
const JUP_BASE_PATH = 'https://jup.audius.co/swap/v1'

let _jup: SwapApi

const initJupiter = () => {
  try {
    return new SwapApi(
      new Configuration({
        basePath: JUP_BASE_PATH
      })
    )
  } catch (e) {
    console.error('Jupiter failed to initialize', e)
    throw e
  }
}

const getInstance = () => {
  if (!_jup) {
    _jup = initJupiter()
  }
  return _jup
}

export const jupiterInstance = getInstance()

export type JupiterMintQuoteParams = {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  slippageBps?: number
  swapMode?: SwapMode
  onlyDirectRoutes?: boolean
  maxAccounts?: number
}

export type JupiterQuoteResult = {
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

export const getJupiterQuoteByMint = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  slippageBps,
  swapMode = 'ExactIn',
  onlyDirectRoutes = false,
  maxAccounts = DEFAULT_MAX_ACCOUNTS
}: JupiterMintQuoteParams): Promise<JupiterQuoteResult> => {
  const amount =
    swapMode === 'ExactIn'
      ? Number(new FixedDecimal(amountUi, inputDecimals).value.toString())
      : Number(new FixedDecimal(amountUi, outputDecimals).value.toString())

  const quote = await jupiterInstance.quoteGet({
    inputMint,
    outputMint,
    amount,
    slippageBps,
    swapMode,
    onlyDirectRoutes,
    maxAccounts,
    dynamicSlippage: !slippageBps
  })

  if (!quote) {
    throw new Error('Failed to get Jupiter quote')
  }

  return {
    inputAmount: convertBigIntToAmountObject(
      BigInt(quote.inAmount),
      inputDecimals
    ),
    outputAmount: convertBigIntToAmountObject(
      BigInt(quote.outAmount),
      outputDecimals
    ),
    otherAmountThreshold: convertBigIntToAmountObject(
      BigInt(quote.otherAmountThreshold),
      swapMode === 'ExactIn' ? outputDecimals : inputDecimals
    ),
    quote
  }
}

export type JupiterQuoteWithRetryResult = {
  maxAccountsValue: number
  quoteResult: JupiterQuoteResult
}

export const getJupiterQuoteByMintWithRetry = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  slippageBps,
  swapMode = 'ExactIn',
  onlyDirectRoutes = false
}: Omit<
  JupiterMintQuoteParams,
  'maxAccounts'
>): Promise<JupiterQuoteWithRetryResult> => {
  let maxAccounts = DEFAULT_MAX_ACCOUNTS
  let lastError
  let quoteResult: JupiterQuoteResult | null = null

  while (maxAccounts <= MAX_ALLOWED_ACCOUNTS) {
    try {
      quoteResult = await getJupiterQuoteByMint({
        inputMint,
        outputMint,
        inputDecimals,
        outputDecimals,
        amountUi,
        slippageBps,
        swapMode,
        onlyDirectRoutes,
        maxAccounts
      })
      break
    } catch (err) {
      lastError = err
      maxAccounts += 10
      if (maxAccounts > MAX_ALLOWED_ACCOUNTS) {
        throw lastError
      }
    }
  }

  if (quoteResult === null) {
    throw lastError
  }

  return {
    maxAccountsValue: maxAccounts,
    quoteResult
  }
}

export const convertJupiterInstructions = (
  instructions: (Instruction | undefined)[]
): TransactionInstruction[] => {
  const filteredInstructions = instructions.filter(removeNullable)

  return filteredInstructions.map((i) => {
    return {
      programId: new PublicKey(i.programId),
      data: Buffer.from(i.data, 'base64'),
      keys: i.accounts.map((a) => {
        return {
          pubkey: new PublicKey(a.pubkey),
          isSigner: a.isSigner,
          isWritable: a.isWritable
        }
      })
    } as TransactionInstruction
  })
}
