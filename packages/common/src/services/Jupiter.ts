import { FixedDecimal } from '@audius/fixed-decimal'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import type { QuoteResponse } from '@jup-ag/api'

import { TOKEN_LISTING_MAP } from '~/store/ui/buy-audio/constants'
import { convertBigIntToAmountObject, removeNullable } from '~/utils'

/**
 * The error that gets returned if the slippage is exceeded
 * @see https://github.com/jup-ag/jupiter-cpi/blob/5eb897736d294767200302efd070b16343d8c618/idl.json#L2910-L2913
 * @see https://station.jup.ag/docs/additional-topics/troubleshooting#swap-execution
 */
export const SLIPPAGE_TOLERANCE_EXCEEDED_ERROR = 6001

// Define JupiterTokenSymbol type here since we can't import it directly
export type JupiterTokenSymbol = keyof typeof TOKEN_LISTING_MAP

export const DEFAULT_MAX_ACCOUNTS = 20
export const MAX_ALLOWED_ACCOUNTS = 64
const ULTRA_BASE_URL = 'https://jup.audius.co/ultra/v1'

// Ultra API types
export type SwapMode = 'ExactIn' | 'ExactOut'

// Legacy instruction type for compatibility
export interface Instruction {
  programId: string
  data: string
  accounts: Array<{
    pubkey: string
    isSigner: boolean
    isWritable: boolean
  }>
}

export interface UltraOrderResponse extends QuoteResponse {
  mode: string
  transaction?: string
  requestId?: string
}

export interface UltraExecuteRequest {
  requestId: string
  userPublicKey: string
  signature: string
}

export interface UltraExecuteResponse {
  txid: string
  status: string
}

export type JupiterQuoteParams = {
  inputTokenSymbol: JupiterTokenSymbol
  outputTokenSymbol: JupiterTokenSymbol
  inputAmount: number
  slippageBps: number
  swapMode?: SwapMode
  onlyDirectRoutes?: boolean
}

// Add support for mint-based parameters for the useSwapCoins hook
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
  taker?: string // User's wallet address for transaction execution
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
  order: UltraOrderResponse
  // Keep quote for backward compatibility (maps to order for Ultra API)
  quote: UltraOrderResponse
}

/**
 * Gets a quote from Jupiter Ultra API using mint addresses directly
 * This version is used by the useSwapCoins hook
 */
export const getJupiterQuoteByMint = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  slippageBps,
  swapMode = 'ExactIn',
  onlyDirectRoutes = false,
  maxAccounts = DEFAULT_MAX_ACCOUNTS,
  taker
}: JupiterMintQuoteParams): Promise<JupiterQuoteResult> => {
  const amount =
    swapMode === 'ExactIn'
      ? Number(new FixedDecimal(amountUi, inputDecimals).value.toString())
      : Number(new FixedDecimal(amountUi, outputDecimals).value.toString())

  console.log('REED Jupiter quote request:', {
    inputMint,
    outputMint,
    amountUi,
    inputDecimals,
    outputDecimals,
    swapMode,
    calculatedAmount: amount,
    amountAsString: amount.toString(),
    taker
  })

  // Build query parameters for Ultra API
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    swapMode,
    ...(slippageBps && { slippageBps: slippageBps.toString() }),
    ...(onlyDirectRoutes && { onlyDirectRoutes: 'true' }),
    ...(maxAccounts && { maxAccounts: maxAccounts.toString() }),
    ...(taker && { taker })
  })

  const url = `${ULTRA_BASE_URL}/order?${params.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // Note: Ultra API may require API key in production
        // 'Authorization': `Bearer ${process.env.JUPITER_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(
        `Ultra API request failed: ${response.status} ${response.statusText}`
      )
    }

    const order: UltraOrderResponse = await response.json()

    if (!order) {
      throw new Error('Failed to get Jupiter Ultra order')
    }

    // Add legacy compatibility properties
    const enhancedOrder: UltraOrderResponse = {
      ...order,
      slippageBps: slippageBps || 50, // Default slippage
      priceImpactPct: '0', // Ultra API doesn't provide this, default to 0
      routePlan: [], // Ultra API doesn't provide route details
      contextSlot: 0,
      timeTaken: 0
    }

    return {
      inputAmount: convertBigIntToAmountObject(
        BigInt(order.inAmount),
        inputDecimals
      ),
      outputAmount: convertBigIntToAmountObject(
        BigInt(order.outAmount),
        outputDecimals
      ),
      otherAmountThreshold: convertBigIntToAmountObject(
        BigInt(order.otherAmountThreshold),
        swapMode === 'ExactIn' ? outputDecimals : inputDecimals
      ),
      order: enhancedOrder,
      quote: enhancedOrder // Backward compatibility
    }
  } catch (error) {
    console.error('Ultra API error:', error)
    throw error
  }
}

export type JupiterQuoteWithRetryResult = {
  maxAccountsValue: number
  quoteResult: JupiterQuoteResult
}

/**
 * Gets a Jupiter Ultra quote with automatic retry logic
 * Uses the Ultra API with basic retry for transient failures
 * Returns the successful quote result
 */
export const getJupiterQuoteByMintWithRetry = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  slippageBps,
  swapMode = 'ExactIn',
  onlyDirectRoutes = false,
  taker
}: Omit<
  JupiterMintQuoteParams,
  'maxAccounts'
>): Promise<JupiterQuoteWithRetryResult> => {
  const MAX_RETRIES = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const quoteResult = await getJupiterQuoteByMint({
        inputMint,
        outputMint,
        inputDecimals,
        outputDecimals,
        amountUi,
        slippageBps,
        swapMode,
        onlyDirectRoutes,
        maxAccounts: DEFAULT_MAX_ACCOUNTS,
        taker
      })

      return {
        maxAccountsValue: DEFAULT_MAX_ACCOUNTS,
        quoteResult
      }
    } catch (err) {
      lastError = err as Error
      console.warn(`Ultra API attempt ${attempt + 1} failed:`, err)

      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        )
      }
    }
  }

  throw (
    lastError || new Error('Failed to get Jupiter Ultra quote after retries')
  )
}

/**
 * Executes a Jupiter Ultra swap transaction
 */
export const executeJupiterUltraSwap = async (
  requestId: string,
  userPublicKey: string,
  signature: string
): Promise<UltraExecuteResponse> => {
  const url = `${ULTRA_BASE_URL}/execute`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Note: Ultra API may require API key in production
        // 'Authorization': `Bearer ${process.env.JUPITER_API_KEY}`
      },
      body: JSON.stringify({
        requestId,
        userPublicKey,
        signature
      })
    })

    if (!response.ok) {
      throw new Error(
        `Ultra API execute request failed: ${response.status} ${response.statusText}`
      )
    }

    const result: UltraExecuteResponse = await response.json()
    return result
  } catch (error) {
    console.error('Ultra API execute error:', error)
    throw error
  }
}

// Create legacy Jupiter API instance for backward compatibility
// This is used for swap instruction building while quotes use Ultra API
let _legacyJupiter: any

const getLegacyJupiterInstance = () => {
  if (!_legacyJupiter) {
    try {
      // Dynamic import to avoid issues if @jup-ag/api is not available
      const { SwapApi, Configuration } = require('@jup-ag/api')
      _legacyJupiter = new SwapApi(
        new Configuration({
          basePath: 'https://jup.audius.co/swap/v1'
        })
      )
    } catch (e) {
      console.error('Legacy Jupiter failed to initialize', e)
      throw e
    }
  }
  return _legacyJupiter
}

// Export legacy jupiterInstance for backward compatibility
export const jupiterInstance = {
  swapInstructionsPost: (...args: any[]) => {
    const instance = getLegacyJupiterInstance()
    return instance.swapInstructionsPost(...args)
  },
  quoteGet: (..._args: any[]) => {
    throw new Error(
      'Jupiter has been migrated to Ultra API. Use getJupiterQuoteByMint instead.'
    )
  }
}
/**
 * Converts an array of Jupiter instructions to Solana TransactionInstructions
 * Filters out undefined instructions and handles the conversion
 */
export const convertJupiterInstructions = (
  instructions: (Instruction | undefined)[]
): TransactionInstruction[] => {
  // Flatten and filter out undefined instructions
  const filteredInstructions = instructions.filter(removeNullable)

  // Convert to Solana TransactionInstruction format
  return filteredInstructions.map((i) => {
    return {
      programId: new PublicKey(i.programId),
      data: Buffer.from(i.data, 'base64'),
      keys: i.accounts.map(
        (a: { pubkey: string; isSigner: boolean; isWritable: boolean }) => {
          return {
            pubkey: new PublicKey(a.pubkey),
            isSigner: a.isSigner,
            isWritable: a.isWritable
          }
        }
      )
    } as TransactionInstruction
  })
}
