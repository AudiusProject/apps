import { TOKEN_LISTING_MAP, JupiterTokenSymbol } from '@audius/common/store'
import { convertBigIntToAmountObject } from '@audius/common/utils'
import { createJupiterApiClient, Instruction, QuoteResponse } from '@jup-ag/api'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'

let _jup: ReturnType<typeof createJupiterApiClient>

const getInstance = () => {
  if (!_jup) {
    _jup = initJupiter()
  }
  return _jup
}

const initJupiter = () => {
  try {
    return createJupiterApiClient()
  } catch (e) {
    console.error('Jupiter failed to initialize', e)
    throw e
  }
}

type JupiterSwapMode = 'ExactIn' | 'ExactOut'

/**
 * Gets a quote from Jupiter for an exchange from inputTokenSymbol => outputTokenSymbol
 * @returns the best quote including the RouteInfo
 */
const getQuote = async ({
  inputTokenSymbol,
  outputTokenSymbol,
  inputAmount,
  slippageBps,
  swapMode = 'ExactIn',
  onlyDirectRoutes = false
}: {
  inputTokenSymbol: JupiterTokenSymbol
  outputTokenSymbol: JupiterTokenSymbol
  inputAmount: number
  slippageBps: number
  swapMode?: JupiterSwapMode
  onlyDirectRoutes?: boolean
}) => {
  const inputToken = TOKEN_LISTING_MAP[inputTokenSymbol]
  const outputToken = TOKEN_LISTING_MAP[outputTokenSymbol]
  if (!inputToken || !outputToken) {
    throw new Error(
      `Tokens not found: ${inputTokenSymbol} => ${outputTokenSymbol}`
    )
  }
  const amount =
    swapMode === 'ExactIn'
      ? Math.ceil(inputAmount * 10 ** inputToken.decimals)
      : Math.floor(inputAmount * 10 ** outputToken.decimals)
  const jup = getInstance()
  const quote = await jup.quoteGet({
    inputMint: inputToken.address,
    outputMint: outputToken.address,
    amount,
    slippageBps,
    swapMode,
    onlyDirectRoutes
  })

  if (!quote) {
    throw new Error('Failed to get Jupiter quote')
  }

  return {
    inputAmount: convertBigIntToAmountObject(
      BigInt(quote.inAmount),
      inputToken.decimals
    ),
    outputAmount: convertBigIntToAmountObject(
      BigInt(quote.outAmount),
      outputToken.decimals
    ),
    otherAmountThreshold: convertBigIntToAmountObject(
      BigInt(quote.otherAmountThreshold),
      swapMode === 'ExactIn' ? outputToken.decimals : inputToken.decimals
    ),
    quote,
    inputTokenSymbol,
    outputTokenSymbol
  }
}

const getSwapInstructions = async ({
  quote,
  userPublicKey,
  destinationTokenAccount,
  wrapAndUnwrapSol = true,
  useSharedAccounts = true
}: {
  quote: QuoteResponse
  userPublicKey: PublicKey
  destinationTokenAccount?: PublicKey
  wrapAndUnwrapSol?: boolean
  useSharedAccounts?: boolean
}) => {
  const jup = getInstance()
  const response = await jup.swapInstructionsPost({
    swapRequest: {
      quoteResponse: quote,
      userPublicKey: userPublicKey.toString(),
      destinationTokenAccount: destinationTokenAccount?.toString(),
      wrapAndUnwrapSol,
      computeUnitPriceMicroLamports: 100000,
      useSharedAccounts
    }
  })
  const {
    computeBudgetInstructions,
    setupInstructions,
    swapInstruction,
    cleanupInstruction,
    addressLookupTableAddresses
  } = response
  const instructionsFlattened = [
    ...computeBudgetInstructions,
    ...setupInstructions,
    swapInstruction,
    cleanupInstruction
  ]
    .filter((i): i is Instruction => i !== undefined)
    .map((i) => {
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
  return {
    instructions: instructionsFlattened,
    response,
    lookupTableAddresses: addressLookupTableAddresses
  }
}

export const JupiterSingleton = {
  getQuote,
  getSwapInstructions
}
