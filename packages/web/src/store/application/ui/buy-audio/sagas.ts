import {
  QUERY_KEYS,
  WalletAddresses,
  getAccountTotalAudioBalanceSaga,
  queryWalletAddresses
} from '@audius/common/api'
import { Name, ErrorLevel } from '@audius/common/models'
import {
  IntKeys,
  FeatureFlags,
  createUserBankIfNeeded,
  LocalStorage,
  MEMO_PROGRAM_ID
} from '@audius/common/services'
import {
  buyAudioActions,
  buyAudioSelectors,
  transactionDetailsActions,
  modalsActions,
  OnRampProvider,
  PurchaseInfoErrorType,
  TOKEN_LISTING_MAP,
  TransactionType,
  TransactionMethod,
  TransactionMetadataType,
  getContext,
  AmountObject,
  TransactionDetails,
  getSDK
} from '@audius/common/store'
import {
  dayjs,
  convertBigIntToAmountObject,
  waitForQueryValue
} from '@audius/common/utils'
import { AUDIO, AudioWei } from '@audius/fixed-decimal'
import { QuoteResponse } from '@jup-ag/api'
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction
} from '@solana/web3.js'
import { takeLatest, takeLeading } from 'redux-saga/effects'
import { call, select, put, take, race, fork } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { track } from 'services/analytics'
import {
  getAssociatedTokenRentExemptionMinimum,
  getAudioAccount,
  getAudioAccountInfo,
  pollForAudioBalanceChange,
  pollForNewTransaction,
  pollForSolBalanceChange,
  getAssociatedTokenAccountInfo
} from 'services/audius-backend/BuyAudio'
import { JupiterSingleton } from 'services/audius-backend/Jupiter'
import {
  TRANSACTION_FEE_FALLBACK,
  getRootAccountRentExemptionMinimum,
  getSolanaConnection
} from 'services/solana/solana'
import { reportToSentry } from 'store/errors/reportToSentry'
import { waitForWrite } from 'utils/sagaHelpers'

const {
  calculateAudioPurchaseInfo,
  calculateAudioPurchaseInfoSucceeded,
  cacheAssociatedTokenAccount,
  cacheTransactionFees,
  startBuyAudioFlow,
  onrampOpened,
  onrampSucceeded,
  onrampCanceled,
  swapCompleted,
  swapStarted,
  transferStarted,
  transferCompleted,
  clearFeesCache,
  calculateAudioPurchaseInfoFailed,
  buyAudioFlowFailed,
  startRecoveryIfNecessary
} = buyAudioActions

const { setVisibility } = modalsActions

const { getBuyAudioFlowStage, getFeesCache, getBuyAudioProvider } =
  buyAudioSelectors
const { fetchTransactionDetailsSucceeded } = transactionDetailsActions

const DEFAULT_SLIPPAGE_BPS = 200 // 2% default slippage allowance for exchanges, overridden in optimizely
const BUY_AUDIO_LOCAL_STORAGE_KEY = 'buy-audio-transaction-details'
const NUM_TRANSFER_TRANSACTIONS = 3

const MEMO_MESSAGES = {
  [OnRampProvider.COINBASE]: 'In-App $AUDIO Purchase: Coinbase Pay',
  [OnRampProvider.STRIPE]: 'In-App $AUDIO Purchase: Link by Stripe',
  [OnRampProvider.UNKNOWN]: 'In-App $AUDIO Purchase: Unknown'
}

const PROVIDER_METHOD_MAP: Record<
  OnRampProvider,
  | TransactionMethod.COINBASE
  | TransactionMethod.STRIPE
  | TransactionMethod.RECEIVE
> = {
  [OnRampProvider.COINBASE]: TransactionMethod.COINBASE,
  [OnRampProvider.STRIPE]: TransactionMethod.STRIPE,
  [OnRampProvider.UNKNOWN]: TransactionMethod.RECEIVE
}

type BuyAudioLocalStorageState = {
  transactionDetailsArgs: {
    purchaseTransactionId?: string
    swapTransactionId?: string
    transferTransactionId?: string
    estimatedUSD?: string
    purchasedLamports?: string
    purchasedAudioWei?: string
  }
  provider: OnRampProvider
  desiredAudioAmount?: AmountObject
}
const defaultBuyAudioLocalStorageState: BuyAudioLocalStorageState = {
  transactionDetailsArgs: {
    purchaseTransactionId: '',
    swapTransactionId: '',
    transferTransactionId: '',
    estimatedUSD: '',
    purchasedLamports: '',
    purchasedAudioWei: ''
  },
  provider: OnRampProvider.UNKNOWN
}

function* getLocalStorageStateWithFallback(): Generator<
  any,
  [LocalStorage, BuyAudioLocalStorageState]
> {
  const audiusLocalStorage = yield* getContext('localStorage')
  const state =
    (yield* call(
      (val: string) =>
        audiusLocalStorage.getJSONValue<BuyAudioLocalStorageState>(val),
      BUY_AUDIO_LOCAL_STORAGE_KEY
    )) ?? defaultBuyAudioLocalStorageState
  return [audiusLocalStorage, state]
}

/**
 * Checks if the associated accounts necessary for a quoted `route` exist on `rootAccount`,
 * and for those that don't, estimates the needed lamports to pay for rent exemption as they are created.
 * Uses the redux store to cache the result.
 * @returns the total amount of lamports necessary for all ATA creation rent fees in a swap and transfer
 */
function* getAssociatedAccountCreationFees({
  quote,
  rootAccount,
  feesCache
}: {
  quote: QuoteResponse
  rootAccount: PublicKey
  feesCache: ReturnType<typeof getFeesCache>
}) {
  const mintKeysSet = new Set<string>()
  for (const route of quote.routePlan) {
    mintKeysSet.add(route.swapInfo.inputMint)
    mintKeysSet.add(route.swapInfo.outputMint)
  }
  const minRentForATA = yield* call(getAssociatedTokenRentExemptionMinimum)
  let accountCreationFees = 0
  for (const mintKey of mintKeysSet.values()) {
    const exists = feesCache?.associatedTokenAccountCache[mintKey.toString()]
    if (exists === false) {
      accountCreationFees += minRentForATA
    } else if (exists === undefined) {
      const accountInfo = yield* call(getAssociatedTokenAccountInfo, {
        rootAccount,
        mintKey: new PublicKey(mintKey)
      })
      console.debug()
      yield* put(
        cacheAssociatedTokenAccount({
          account: mintKey.toString(),
          exists: accountInfo !== null
        })
      )
      if (accountInfo === null) {
        accountCreationFees += minRentForATA
      }
    }
  }
  return accountCreationFees
}

/**
 * Creates the transactions necessary for a swap and transfer to calculate transaction fees
 * @returns the total amount of lamports necessary for all transaction fees in a swap and transfer
 */
function* getTransactionFees({
  quote,
  rootAccount,
  feesCache
}: {
  quote: QuoteResponse
  rootAccount: PublicKey
  feesCache: ReturnType<typeof getFeesCache>
}) {
  let transactionFees = feesCache?.transactionFees ?? 0
  if (!transactionFees) {
    const transferTransaction = yield* call(getTransferTransaction, {
      source: rootAccount,
      provider: OnRampProvider.COINBASE,
      transferAmount: BigInt(0)
    })
    const connection = yield* call(getSolanaConnection)
    const transferFee = yield* call(
      [connection, connection.getFeeForMessage],
      transferTransaction.message
    )
    // Pad by a multiple in case of failure so that transfer retries can succeed
    transactionFees +=
      (transferFee.value ?? TRANSACTION_FEE_FALLBACK) *
      NUM_TRANSFER_TRANSACTIONS

    // Calculate fees for swap transaction (v0 transaction)
    const swapTransaction = yield* call(getSwapTransaction, {
      quote,
      source: rootAccount
    })
    const swapFees = yield* call(
      [connection, connection.getFeeForMessage],
      swapTransaction.message
    )
    transactionFees += swapFees.value ?? TRANSACTION_FEE_FALLBACK

    yield* put(cacheTransactionFees({ transactionFees }))
  }
  return transactionFees
}

/**
 * Calculates all the fees required for executing a swap and transfer by doing a "dry-run"
 * @returns the transaction fees and ATA creation fees (in lamports)
 */
function* getSwapFees({ quote }: { quote: QuoteResponse }) {
  const feesCache = yield* select(getFeesCache)
  const solanaWalletService = yield* getContext('solanaWalletService')
  const rootAccount = yield* call([
    solanaWalletService,
    solanaWalletService.getKeypair
  ])

  if (!rootAccount) {
    throw new Error('Missing solana root wallet')
  }

  const rootAccountMinBalance = yield* call(getRootAccountRentExemptionMinimum)
  const associatedAccountCreationFees = yield* call(
    getAssociatedAccountCreationFees,
    { rootAccount: rootAccount.publicKey, quote, feesCache }
  )
  const transactionFees = yield* call(getTransactionFees, {
    rootAccount: rootAccount.publicKey,
    quote,
    feesCache
  })
  console.debug(
    `Estimated transaction fees: ${
      transactionFees / LAMPORTS_PER_SOL
    } SOL. Estimated associated account rent-exemption fees: ${
      associatedAccountCreationFees / LAMPORTS_PER_SOL
    } SOL. Estimated root account rent-exemption fee: ${
      rootAccountMinBalance / LAMPORTS_PER_SOL
    } SOL. Total estimated fees: ${
      (associatedAccountCreationFees +
        transactionFees +
        rootAccountMinBalance) /
      LAMPORTS_PER_SOL
    }`
  )
  return {
    rootAccountMinBalance,
    transactionFees,
    associatedAccountCreationFees,
    totalFees:
      rootAccountMinBalance + transactionFees + associatedAccountCreationFees
  }
}

function* getBuyAudioRemoteConfig() {
  const DEFAULT_MIN_AUDIO_PURCHASE_AMOUNT = 5
  const DEFAULT_MAX_AUDIO_PURCHASE_AMOUNT = 999
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')
  yield* call([remoteConfigInstance, remoteConfigInstance.waitForRemoteConfig])
  const minAudioAmount =
    remoteConfigInstance.getRemoteVar(IntKeys.MIN_AUDIO_PURCHASE_AMOUNT) ??
    DEFAULT_MIN_AUDIO_PURCHASE_AMOUNT
  const maxAudioAmount =
    remoteConfigInstance.getRemoteVar(IntKeys.MAX_AUDIO_PURCHASE_AMOUNT) ??
    DEFAULT_MAX_AUDIO_PURCHASE_AMOUNT
  const slippageBps =
    remoteConfigInstance.getRemoteVar(IntKeys.BUY_AUDIO_SLIPPAGE) ??
    DEFAULT_SLIPPAGE_BPS
  const retryDelayMs =
    remoteConfigInstance.getRemoteVar(IntKeys.BUY_TOKEN_WALLET_POLL_DELAY_MS) ??
    undefined
  const maxRetryCount =
    remoteConfigInstance.getRemoteVar(
      IntKeys.BUY_TOKEN_WALLET_POLL_MAX_RETRIES
    ) ?? undefined
  return {
    minAudioAmount,
    maxAudioAmount,
    slippageBps,
    maxRetryCount,
    retryDelayMs
  }
}

function* getAudioPurchaseInfo({
  payload: { audioAmount }
}: ReturnType<typeof calculateAudioPurchaseInfo>) {
  const sdk = yield* getSDK()
  const solanaWalletService = yield* getContext('solanaWalletService')
  try {
    // Fail early if audioAmount is too small/large
    const { minAudioAmount, maxAudioAmount, slippageBps } = yield* call(
      getBuyAudioRemoteConfig
    )
    if (audioAmount > maxAudioAmount) {
      yield* put(
        calculateAudioPurchaseInfoFailed({
          errorType: PurchaseInfoErrorType.MAX_AUDIO_EXCEEDED,
          maxAudio: maxAudioAmount
        })
      )
      return
    } else if (audioAmount < minAudioAmount) {
      yield* put(
        calculateAudioPurchaseInfoFailed({
          errorType: PurchaseInfoErrorType.MIN_AUDIO_EXCEEDED,
          minAudio: minAudioAmount
        })
      )
      return
    }

    // Ensure userbank is created
    const { currentUser } = yield* call(queryWalletAddresses)
    if (!currentUser) {
      throw new Error('Failed to get current user wallet address')
    }

    yield* fork(function* () {
      yield* call(createUserBankIfNeeded, sdk, {
        recordAnalytics: track,
        ethAddress: currentUser,
        mint: 'wAUDIO'
      })
    })

    // Setup
    const connection = yield* call(getSolanaConnection)
    const rootAccount = yield* call([
      solanaWalletService,
      solanaWalletService.getKeypair
    ])
    if (!rootAccount) {
      throw new Error('Missing solana root wallet')
    }

    // Get AUDIO => SOL quote
    const reverseQuote = yield* call(JupiterSingleton.getQuote, {
      inputTokenSymbol: 'AUDIO',
      outputTokenSymbol: 'SOL',
      inputAmount: audioAmount,
      slippageBps
    })
    const slippageFactor = 100 / (100 - slippageBps / 100)

    // Adjust quote for potential slippage
    const inSol = Math.ceil(reverseQuote.outputAmount.amount * slippageFactor)

    // Get SOL => AUDIO quote to calculate fees
    const quote = yield* call(JupiterSingleton.getQuote, {
      inputTokenSymbol: 'SOL',
      outputTokenSymbol: 'AUDIO',
      inputAmount: inSol / LAMPORTS_PER_SOL,
      slippageBps
    })
    const {
      rootAccountMinBalance,
      associatedAccountCreationFees,
      transactionFees
    } = yield* call(getSwapFees, { quote: quote.quote })

    // Get existing solana balance
    const existingBalance = yield* call(
      [connection, connection.getBalance],
      rootAccount.publicKey,
      'finalized'
    )

    // The amount needed to purchase is the SOL required to produce the output
    // AUDIO plus all SOL necessary to facilitate the transaction less the SOL
    // the user already has in their root wallet.
    const estimatedLamports = Math.max(
      inSol +
        associatedAccountCreationFees +
        transactionFees +
        rootAccountMinBalance -
        existingBalance,
      0
    )

    // Get SOL => USDC quote to estimate $USD cost
    const quoteUSD = yield* call(JupiterSingleton.getQuote, {
      inputTokenSymbol: 'SOL',
      outputTokenSymbol: 'USDC',
      inputAmount: estimatedLamports / LAMPORTS_PER_SOL,
      slippageBps: 0
    })

    console.debug(
      `Quoted: ${reverseQuote.outputAmount.uiAmountString} SOL
Adjustment For Slippage (${slippageBps}bps): ${
        (inSol - reverseQuote.outputAmount.amount) / LAMPORTS_PER_SOL
      } SOL
Fees: ${
        (associatedAccountCreationFees +
          rootAccountMinBalance +
          transactionFees) /
        LAMPORTS_PER_SOL
      } SOL
Existing Balance: ${existingBalance / LAMPORTS_PER_SOL} SOL
Total: ${estimatedLamports / LAMPORTS_PER_SOL} SOL ($${
        quoteUSD.outputAmount.uiAmountString
      } USDC)`
    )

    yield* put(
      calculateAudioPurchaseInfoSucceeded({
        estimatedSOL: convertBigIntToAmountObject(
          BigInt(estimatedLamports),
          TOKEN_LISTING_MAP.SOL.decimals
        ),
        estimatedUSD: quoteUSD.outputAmount,
        desiredAudioAmount: convertBigIntToAmountObject(
          BigInt(
            Math.ceil(audioAmount * 10 ** TOKEN_LISTING_MAP.AUDIO.decimals)
          ),
          TOKEN_LISTING_MAP.AUDIO.decimals
        )
      })
    )
  } catch (e) {
    console.error('Failed to get AUDIO purchase info:', e)
  }
}

function* populateAndSaveTransactionDetails() {
  // Get transaction details from local storage
  const [, localStorageState] = yield* getLocalStorageStateWithFallback()
  const identityService = yield* getContext('identityService')
  const {
    purchaseTransactionId,
    swapTransactionId,
    transferTransactionId,
    estimatedUSD,
    purchasedLamports,
    purchasedAudioWei
  } = localStorageState.transactionDetailsArgs

  if (!transferTransactionId) {
    throw new Error('Missing transactionDetailsArgs[transferTransactionId]')
  }

  const postAUDIOBalanceWei = yield* call(getAccountTotalAudioBalanceSaga)
  const purchasedAUDIO = purchasedAudioWei
    ? AUDIO(BigInt(purchasedAudioWei))
        .toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 18
        })
        .replaceAll(',', '')
    : ''
  const purchasedLamportsBigInt = BigInt(purchasedLamports || '0')
  const divisor = BigInt(LAMPORTS_PER_SOL)
  const purchasedSOL =
    purchasedLamportsBigInt > 0
      ? `${(purchasedLamportsBigInt / divisor).toString()}.${(
          purchasedLamportsBigInt % divisor
        )
          .toString()
          .padStart(divisor.toString().length - 1, '0')}`
      : ''

  const transactionMetadata = {
    discriminator: TransactionMetadataType.PURCHASE_SOL_AUDIO_SWAP,
    purchaseTransactionId: purchaseTransactionId ?? '',
    swapTransactionId: swapTransactionId ?? '',
    usd: estimatedUSD ?? '',
    sol: purchasedSOL,
    audio: purchasedAUDIO
  }
  const transactionDetails: TransactionDetails = {
    date: dayjs().format('MM/DD/YYYY'),
    signature: transferTransactionId,
    transactionType: TransactionType.PURCHASE,
    method:
      PROVIDER_METHOD_MAP[localStorageState.provider ?? OnRampProvider.UNKNOWN],
    balance: postAUDIOBalanceWei.toString(),
    change: purchasedAudioWei
      ? (BigInt(purchasedAudioWei) / BigInt(10 ** 9)).toString()
      : '',
    metadata: transactionMetadata
  }

  yield* put(
    fetchTransactionDetailsSucceeded({
      transactionId: transferTransactionId,
      transactionDetails
    })
  )
  yield* call(
    [identityService, identityService.saveUserBankTransactionMetadata],
    {
      transactionSignature: transferTransactionId,
      metadata: transactionMetadata
    }
  )

  // Clear local storage
  console.debug('Clearing BUY_AUDIO_LOCAL_STORAGE...')
  yield* call(
    [localStorage, localStorage.removeItem],
    BUY_AUDIO_LOCAL_STORAGE_KEY
  )
}

type PurchaseStepParams = {
  estimatedSOL: AmountObject
  connection: Connection
  rootAccount: Keypair
  provider: OnRampProvider
  retryDelayMs?: number
  maxRetryCount?: number
}
/**
 * Executes the purchase step of the on-ramp
 *
 * @throws if cannot confirm the purchase
 * @returns the new SOL balance for the rootAccount after the purchase succeeds
 */
function* purchaseStep({
  estimatedSOL,
  connection,
  rootAccount,
  provider,
  retryDelayMs,
  maxRetryCount
}: PurchaseStepParams) {
  // Cache current SOL balance and tip of transaction history
  const initialBalance = yield* call(
    [connection, connection.getBalance],
    rootAccount.publicKey,
    'finalized'
  )
  const initialTransactions = yield* call(
    [connection, connection.getSignaturesForAddress],
    rootAccount.publicKey,
    {
      limit: 1
    }
  )
  const initialTransaction = initialTransactions?.[0]?.signature

  // Wait for on ramp finish
  const result = yield* race({
    success: take(onrampSucceeded),
    canceled: take(onrampCanceled)
  })

  // If the user didn't complete the on ramp flow, return early
  if (result.canceled) {
    yield* put(make(Name.BUY_AUDIO_ON_RAMP_CANCELED, { provider }))
    return {}
  }
  yield* put(make(Name.BUY_AUDIO_ON_RAMP_SUCCESS, { provider }))

  // Wait for the SOL funds to come through
  const newBalance = yield* call(pollForSolBalanceChange, {
    rootAccount: rootAccount.publicKey,
    initialBalance,
    retryDelayMs,
    maxRetryCount
  })

  // Get the purchase transaction
  const purchaseTransactionId = yield* call(pollForNewTransaction, {
    initialTransaction,
    rootAccount: rootAccount.publicKey,
    retryDelayMs,
    maxRetryCount
  })

  // Check that we got the requested SOL
  const purchasedLamports = newBalance - initialBalance
  if (purchasedLamports !== estimatedSOL.amount) {
    console.warn(
      `Warning: Purchase SOL amount differs from expected. Actual: ${
        (newBalance - initialBalance) / LAMPORTS_PER_SOL
      } SOL. Expected: ${estimatedSOL.uiAmountString} SOL.`
    )
  }

  const [audiusLocalStorage, localStorageState] =
    yield* getLocalStorageStateWithFallback()
  localStorageState.transactionDetailsArgs.purchaseTransactionId =
    purchaseTransactionId
  localStorageState.transactionDetailsArgs.purchasedLamports =
    purchasedLamports.toString()
  yield* call(
    [audiusLocalStorage, audiusLocalStorage.setJSONValue],
    BUY_AUDIO_LOCAL_STORAGE_KEY,
    localStorageState
  )
  return { purchasedLamports, purchaseTransactionId, newBalance }
}

function* getSwapTransaction({
  quote,
  source
}: {
  quote: QuoteResponse
  source: PublicKey
}) {
  const sdk = yield* getSDK()
  const { instructions: swapInstructions, lookupTableAddresses } = yield* call(
    JupiterSingleton.getSwapInstructions,
    {
      quote,
      userPublicKey: source
    }
  )
  const transaction = yield* call(
    [sdk.services.solanaClient, sdk.services.solanaClient.buildTransaction],
    {
      instructions: swapInstructions,
      feePayer: source,
      addressLookupTables: lookupTableAddresses.map(
        (address) => new PublicKey(address)
      ),
      priorityFee: null, // already has compute budget instructions from Jupiter
      computeLimit: null // already has compute budget instructions from Jupiter
    }
  )
  return transaction
}

type SwapStepParams = {
  exchangeAmount: bigint
  desiredAudioAmount?: AmountObject
  rootAccount: Keypair
  retryDelayMs?: number
  maxRetryCount?: number
}
/**
 * Executes the Jupiter exchange from SOL to $AUDIO
 *
 * @throws if cannot confirm the swap
 * @returns the $AUDIO amount resulting from the swap
 */
function* swapStep({
  exchangeAmount,
  desiredAudioAmount,
  rootAccount,
  retryDelayMs,
  maxRetryCount
}: SwapStepParams) {
  const { slippageBps } = yield* call(getBuyAudioRemoteConfig)
  // Get quote adjusted for fees
  const quote = yield* call(JupiterSingleton.getQuote, {
    inputTokenSymbol: 'SOL',
    outputTokenSymbol: 'AUDIO',
    inputAmount: Number(exchangeAmount) / LAMPORTS_PER_SOL,
    slippageBps
  })

  // Check that we get the desired AUDIO from the quote
  const audioAdjusted = convertBigIntToAmountObject(
    BigInt(
      Math.floor(
        (Number(quote.quote.outAmount) * 100 - slippageBps / 100) / 100
      )
    ),
    TOKEN_LISTING_MAP.AUDIO.decimals
  )
  if (
    desiredAudioAmount !== undefined &&
    desiredAudioAmount.amount > audioAdjusted.amount
  ) {
    console.warn(
      `Warning: Purchase AUDIO amount may be lower than expected. Actual min: ${audioAdjusted.uiAmountString} AUDIO. Expected min: ${desiredAudioAmount.uiAmountString} AUDIO`
    )
  }

  // Cache the AUDIO balance before swapping
  const tokenAccount = yield* call(getAudioAccount, {
    rootAccount: rootAccount.publicKey
  })
  let beforeSwapAudioBalance = BigInt(0)
  try {
    const beforeSwapAudioAccountInfo = yield* call(getAudioAccountInfo, {
      tokenAccount
    })
    beforeSwapAudioBalance = beforeSwapAudioAccountInfo?.amount ?? BigInt(0)
  } catch (e) {
    console.error(
      'Failed to get AUDIO balance before swap, using 0 balance:',
      e
    )
  }

  // Swap the SOL for AUDIO
  yield* put(swapStarted())
  const transaction = yield* call(getSwapTransaction, {
    quote: quote.quote,
    source: rootAccount.publicKey
  })
  transaction.sign([rootAccount])
  const sdk = yield* getSDK()
  const txId = yield* call(
    [sdk.services.solanaClient, sdk.services.solanaClient.sendTransaction],
    transaction,
    {
      skipPreflight: true
    }
  )

  // Write transaction details to local storage
  const [audiusLocalStorage, localStorageState] =
    yield* getLocalStorageStateWithFallback()
  localStorageState.transactionDetailsArgs.swapTransactionId = txId ?? undefined
  yield* call(
    [audiusLocalStorage, audiusLocalStorage.setJSONValue],
    BUY_AUDIO_LOCAL_STORAGE_KEY,
    localStorageState
  )

  yield* put(swapCompleted())

  // Reset associated token account cache now that the swap created the accounts
  // (can't simply set all the accounts in the route to "exists" because wSOL gets closed)
  yield* put(clearFeesCache())

  // Wait for AUDIO funds to come through
  const audioSwappedSpl = yield* call(pollForAudioBalanceChange, {
    tokenAccount,
    initialBalance: beforeSwapAudioBalance,
    retryDelayMs,
    maxRetryCount
  })
  return {
    swapTransactionId: txId,
    audioSwappedSpl
  }
}

type TransferTransactionParams = {
  source: PublicKey
  transferAmount: bigint
  provider: OnRampProvider
}
function* getTransferTransaction({
  source,
  provider,
  transferAmount
}: TransferTransactionParams) {
  const sdk = yield* getSDK()
  const env = yield* getContext('env')
  const { currentUser } = yield* call(queryWalletAddresses)
  if (!currentUser) {
    throw new Error('Failed to get current user wallet address')
  }
  const userBank = yield* call(
    [
      sdk.services.claimableTokensClient,
      sdk.services.claimableTokensClient.deriveUserBank
    ],
    {
      ethWallet: currentUser,
      mint: 'wAUDIO'
    }
  )
  const mintPublicKey = new PublicKey(env.WAUDIO_MINT_ADDRESS)
  // See: https://github.com/solana-labs/solana-program-library/blob/d6297495ea4dcc1bd48f3efdd6e3bbdaef25a495/memo/js/src/index.ts#L27
  const memoInstruction = new TransactionInstruction({
    keys: [
      {
        pubkey: source,
        isSigner: true,
        isWritable: true
      }
    ],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(MEMO_MESSAGES[provider])
  })
  const transferInstruction = createTransferCheckedInstruction(
    getAssociatedTokenAddressSync(mintPublicKey, source),
    mintPublicKey,
    userBank,
    source,
    transferAmount,
    8
  )
  const transaction = yield* call(
    [sdk.services.solanaClient, sdk.services.solanaClient.buildTransaction],
    {
      feePayer: source,
      instructions: [memoInstruction, transferInstruction]
    }
  )
  return transaction
}

type TransferStepParams = {
  rootAccount: Keypair
  transferAmount: bigint
  provider: OnRampProvider
}
function* transferStep({
  rootAccount,
  transferAmount,
  provider
}: TransferStepParams) {
  const sdk = yield* getSDK()
  yield* put(transferStarted())

  console.debug(`Starting transfer transaction...`)
  let transferError, signature
  const transaction = yield* call(getTransferTransaction, {
    source: rootAccount.publicKey,
    provider,
    transferAmount
  })
  transaction.sign([rootAccount])
  try {
    signature = yield* call(
      [sdk.services.solanaClient, sdk.services.solanaClient.sendTransaction],
      transaction,
      {
        skipPreflight: true
      }
    )
  } catch (e) {
    transferError = e
  }

  if (transferError) {
    console.debug(
      `Transfer transaction stringified: ${JSON.stringify(transaction)}`
    )
    throw new Error(`Transfer transaction failed: ${transferError}`)
  }
  const audioTransferredWei = (transferAmount * BigInt(10 ** 9)) as AudioWei

  // Write transaction details to local storage
  const [audiusLocalStorage, localStorageState] =
    yield* getLocalStorageStateWithFallback()
  localStorageState.transactionDetailsArgs.transferTransactionId =
    signature ?? undefined
  localStorageState.transactionDetailsArgs.purchasedAudioWei =
    audioTransferredWei.toString()
  yield* call(
    [audiusLocalStorage, audiusLocalStorage.setJSONValue],
    BUY_AUDIO_LOCAL_STORAGE_KEY,
    localStorageState
  )

  // Refetch wallet balance
  const queryClient = yield* getContext('queryClient')
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.audioBalance]
  })
  yield* put(transferCompleted())

  return { audioTransferredWei, transferTransactionId: signature }
}

/**
 * Exchanges all but the minimum balance required for a swap from a wallet once a balance change is seen
 */
function* doBuyAudio({
  payload: { desiredAudioAmount, estimatedSOL, estimatedUSD }
}: ReturnType<typeof onrampOpened>) {
  const provider = yield* select(getBuyAudioProvider)
  const sdk = yield* getSDK()
  const solanaWalletService = yield* getContext('solanaWalletService')
  let userRootWallet = ''
  try {
    // Record start
    yield* put(
      make(Name.BUY_AUDIO_ON_RAMP_OPENED, {
        provider
      })
    )

    // Initialize local storage
    const audiusLocalStorage = yield* getContext('localStorage')
    const initialState: BuyAudioLocalStorageState = {
      ...defaultBuyAudioLocalStorageState,
      transactionDetailsArgs: {
        ...defaultBuyAudioLocalStorageState.transactionDetailsArgs,
        estimatedUSD: estimatedUSD.uiAmountString
      },
      provider,
      desiredAudioAmount
    }
    yield* call(
      [audiusLocalStorage, audiusLocalStorage.setJSONValue],
      BUY_AUDIO_LOCAL_STORAGE_KEY,
      initialState
    )

    // Setup
    const rootAccount = yield* call([
      solanaWalletService,
      solanaWalletService.getKeypair
    ])
    if (!rootAccount) {
      throw new Error('Missing solana root wallet')
    }

    const connection = yield* call(getSolanaConnection)
    userRootWallet = rootAccount.publicKey.toString()

    // Get config
    const { retryDelayMs, maxRetryCount, slippageBps } = yield* call(
      getBuyAudioRemoteConfig
    )

    // Ensure userbank is created
    const { currentUser } = yield* call(queryWalletAddresses)
    if (!currentUser) {
      throw new Error('Failed to get current user wallet address')
    }
    yield* fork(function* () {
      yield* call(createUserBankIfNeeded, sdk, {
        recordAnalytics: track,
        mint: 'wAUDIO',
        ethAddress: currentUser
      })
    })

    // STEP ONE: Wait for purchase
    // Have to do some typescript finangling here due to the "race" effect in purchaseStep
    // See https://github.com/agiledigital/typed-redux-saga/issues/43
    const { newBalance } = (yield* call(purchaseStep, {
      provider,
      estimatedSOL,
      connection,
      rootAccount,
      retryDelayMs,
      maxRetryCount
    }) as unknown as ReturnType<typeof purchaseStep>)!

    // If the user canceled the purchase, stop the flow
    if (newBalance === undefined) {
      return
    }

    // Get dummy quote to calculate fees and get exchange amount
    const quote = yield* call(JupiterSingleton.getQuote, {
      inputTokenSymbol: 'SOL',
      outputTokenSymbol: 'AUDIO',
      inputAmount: newBalance / LAMPORTS_PER_SOL,
      slippageBps
    })
    const { totalFees } = yield* call(getSwapFees, { quote: quote.quote })
    const exchangeAmount = newBalance - totalFees
    console.debug(
      `Exchanging ${exchangeAmount / LAMPORTS_PER_SOL} SOL to AUDIO`
    )

    // STEP TWO: Swap to $AUDIO
    const { audioSwappedSpl } = yield* call(swapStep, {
      exchangeAmount: BigInt(exchangeAmount),
      desiredAudioAmount,
      rootAccount,
      retryDelayMs,
      maxRetryCount
    })

    // STEP THREE: Transfer $AUDIO to user bank
    const { audioTransferredWei } = yield* call(transferStep, {
      transferAmount: audioSwappedSpl,
      rootAccount,
      provider
    })

    // Save transaction details
    yield* call(populateAndSaveTransactionDetails)

    // Record success
    yield* put(
      make(Name.BUY_AUDIO_SUCCESS, {
        provider,
        requestedAudio: desiredAudioAmount,
        actualAudio: parseFloat(
          AUDIO(audioTransferredWei)
            .toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 18
            })
            .replaceAll(',', '')
        ),
        surplusAudio: parseFloat(
          (
            (audioSwappedSpl - BigInt(desiredAudioAmount.amount)) /
            BigInt(10 ** 9)
          ).toString()
        )
      })
    )
  } catch (e) {
    const stage = yield* select(getBuyAudioFlowStage)
    yield* call(reportToSentry, {
      level: ErrorLevel.Error,
      error: e as Error,
      additionalInfo: { stage, userRootWallet }
    })
    yield* put(buyAudioFlowFailed())
    yield* put(
      make(Name.BUY_AUDIO_FAILURE, {
        provider,
        stage,
        requestedAudio: desiredAudioAmount.uiAmountString,
        name: 'BuyAudio failed',
        error: (e as Error).message
      })
    )
  }
}

/**
 * There are three main steps that could have failed:
 * 1) The purchase went through, but the Jupiter swap failed, leaving some SOL in the root account
 * 2) The purchase and swap went through, but the final transfer failed, leaving some $AUDIO in the root account
 * 3) The purchase, swap, and final transfer all went through, but writing transaction details metadata failed
 *
 * This function checks for the above conditions sequentially, and pops the modal as necessary.
 */
function* recoverPurchaseIfNecessary() {
  let provider = OnRampProvider.UNKNOWN
  let didNeedRecovery = false
  let userRootWallet = ''
  let recoveredAudio: null | number = null
  try {
    // Bail if not enabled
    yield* call(waitForWrite)
    const getFeatureEnabled = yield* getContext('getFeatureEnabled')
    const solanaWalletService = yield* getContext('solanaWalletService')
    const identityService = yield* getContext('identityService')
    yield* call(
      waitForQueryValue<WalletAddresses>,
      queryWalletAddresses,
      {},
      (wallets) => wallets.currentUser !== null
    )

    if (
      !(
        getFeatureEnabled(FeatureFlags.BUY_AUDIO_COINBASE_ENABLED) ||
        getFeatureEnabled(FeatureFlags.BUY_AUDIO_STRIPE_ENABLED)
      )
    ) {
      return
    }

    // Setup
    const rootAccount = yield* call([
      solanaWalletService,
      solanaWalletService.getKeypair
    ])
    if (!rootAccount) {
      throw new Error('Missing solana root wallet')
    }

    const connection = yield* call(getSolanaConnection)
    userRootWallet = rootAccount.publicKey.toString()

    // Restore local storage state, lightly sanitizing
    const audiusLocalStorage = yield* getContext('localStorage')
    const savedLocalStorageState = (yield* call(
      (val) => audiusLocalStorage.getJSONValue<BuyAudioLocalStorageState>(val),
      BUY_AUDIO_LOCAL_STORAGE_KEY
    )) ?? { transactionDetailsArgs: {} }
    const localStorageState: BuyAudioLocalStorageState = {
      ...defaultBuyAudioLocalStorageState,
      ...savedLocalStorageState,
      transactionDetailsArgs: {
        ...defaultBuyAudioLocalStorageState.transactionDetailsArgs,
        ...savedLocalStorageState?.transactionDetailsArgs
      }
    }
    yield* call(
      [audiusLocalStorage, audiusLocalStorage.setJSONValue],
      BUY_AUDIO_LOCAL_STORAGE_KEY,
      localStorageState
    )
    provider = localStorageState.provider

    // Get config
    const { slippageBps, maxRetryCount, retryDelayMs } = yield* call(
      getBuyAudioRemoteConfig
    )

    // Get existing SOL balance
    const existingBalance = yield* call(
      [connection, connection.getBalance],
      rootAccount.publicKey,
      'finalized'
    )

    const rootMinimum = yield* call(getRootAccountRentExemptionMinimum)
    const ataMinimum = yield* call(getAssociatedTokenRentExemptionMinimum)
    // Pad by some extra lamport amount to reduce false positive rate
    const threshold =
      rootMinimum + TRANSACTION_FEE_FALLBACK * 3 + ataMinimum * 2

    if (existingBalance > threshold) {
      // Get dummy quote and calculate fees
      const quote = yield* call(JupiterSingleton.getQuote, {
        inputTokenSymbol: 'SOL',
        outputTokenSymbol: 'AUDIO',
        inputAmount: existingBalance / LAMPORTS_PER_SOL,
        slippageBps
      })
      const { totalFees } = yield* call(getSwapFees, {
        quote: quote.quote
      })

      // Subtract fees and rent to see how much SOL is available to exchange
      const exchangableBalance = BigInt(existingBalance - totalFees)

      // Use proportion to guesstimate an $AUDIO quote for the exchangeable balance
      const estimatedAudio =
        existingBalance > 0
          ? (BigInt(exchangableBalance) *
              BigInt(quote.outputAmount.amountString)) /
            BigInt(existingBalance)
          : BigInt(0)

      // Check if there's a non-zero exchangeble amount of SOL and at least one $AUDIO would be output
      // Should only occur as the result of a previously failed Swap
      if (
        exchangableBalance > BigInt(0) &&
        estimatedAudio > BigInt(1 * 10 ** TOKEN_LISTING_MAP.AUDIO.decimals)
      ) {
        yield* put(
          make(Name.BUY_AUDIO_RECOVERY_OPENED, {
            provider,
            trigger: 'SOL',
            balance: exchangableBalance.toString()
          })
        )
        console.debug(
          `Found existing SOL balance of ${
            existingBalance / LAMPORTS_PER_SOL
          } SOL, converting ${
            Number(exchangableBalance) / LAMPORTS_PER_SOL
          } SOL to AUDIO... (~${estimatedAudio.toString()} $AUDIO SPL)`
        )

        yield* put(setVisibility({ modal: 'BuyAudioRecovery', visible: true }))
        yield* put(setVisibility({ modal: 'BuyAudio', visible: false }))
        didNeedRecovery = true

        const { audioSwappedSpl } = yield* call(swapStep, {
          exchangeAmount: exchangableBalance,
          desiredAudioAmount: localStorageState.desiredAudioAmount,
          rootAccount,
          maxRetryCount,
          retryDelayMs
        })
        const { audioTransferredWei } = yield* call(transferStep, {
          transferAmount: audioSwappedSpl,
          rootAccount,
          provider: localStorageState.provider ?? OnRampProvider.UNKNOWN
        })
        recoveredAudio = parseFloat(
          AUDIO(audioTransferredWei)
            .toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 18
            })
            .replaceAll(',', '')
        )
        yield* call(populateAndSaveTransactionDetails)
      }
    } else {
      // Check for $AUDIO in the account and transfer if necessary
      const tokenAccount = yield* call(getAudioAccount, {
        rootAccount: rootAccount.publicKey
      })
      let audioAccountInfo
      try {
        audioAccountInfo = yield* call(getAudioAccountInfo, {
          tokenAccount
        })
      } catch (e) {
        audioAccountInfo = null
      }
      const audioBalance = audioAccountInfo?.amount ?? BigInt(0)

      // If the user's root wallet has $AUDIO, that usually indicates a failed transfer
      if (audioBalance > BigInt(0)) {
        const transferTx = yield* call(getTransferTransaction, {
          source: rootAccount.publicKey,
          transferAmount: BigInt(0),
          provider: OnRampProvider.COINBASE
        })
        const transferFee = yield* call(
          [connection, connection.getFeeForMessage],
          transferTx.message
        )
        const neededSolBalance =
          (yield* call(getRootAccountRentExemptionMinimum)) +
          (transferFee.value ?? TRANSACTION_FEE_FALLBACK)

        // Check we can afford to transfer
        if (existingBalance - neededSolBalance > 0) {
          yield* put(
            make(Name.BUY_AUDIO_RECOVERY_OPENED, {
              provider,
              trigger: '$AUDIO',
              balance: audioBalance.toString()
            })
          )
          console.debug(
            `Found existing $AUDIO balance of ${audioBalance}, transferring to user bank...`
          )

          yield* put(
            setVisibility({ modal: 'BuyAudioRecovery', visible: true })
          )
          yield* put(setVisibility({ modal: 'BuyAudio', visible: false }))
          didNeedRecovery = true

          const { audioTransferredWei } = yield* call(transferStep, {
            transferAmount: audioBalance,
            rootAccount,
            provider: localStorageState.provider ?? OnRampProvider.UNKNOWN
          })
          recoveredAudio = parseFloat(
            AUDIO(audioTransferredWei)
              .toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 18
              })
              .replaceAll(',', '')
          )
          yield* call(populateAndSaveTransactionDetails)
        } else {
          // User can't afford to transfer their $AUDIO
          console.debug(
            `OWNED: ${audioBalance.toString()} $AUDIO (spl wei) ${existingBalance.toString()} SOL (lamports)\n` +
              `NEED: ${neededSolBalance.toString()} SOL (lamports)`
          )
          throw new Error(`User is bricked`)
        }
      } else if (
        localStorageState?.transactionDetailsArgs?.transferTransactionId
      ) {
        // If we previously just failed to save the metadata, try that again
        console.debug('Only need to resend metadata...')
        const metadata = yield* call(
          [identityService, identityService.getUserBankTransactionMetadata],
          localStorageState.transactionDetailsArgs.transferTransactionId
        )
        if (!metadata) {
          yield* call(populateAndSaveTransactionDetails)
        }
      }
    }
    yield* put(setVisibility({ modal: 'BuyAudioRecovery', visible: false }))
    if (didNeedRecovery) {
      // If we don't reset state here, this shows the success screen :)
      yield* put(setVisibility({ modal: 'BuyAudio', visible: true }))

      // Report Success
      yield* put(
        make(Name.BUY_AUDIO_RECOVERY_SUCCESS, {
          provider,
          recoveredAudio
        })
      )
    }
  } catch (e) {
    const stage = yield* select(getBuyAudioFlowStage)
    yield* call(reportToSentry, {
      level: ErrorLevel.Error,
      name: 'BuyAudioRecovery failed',
      error: e as Error,
      additionalInfo: { stage, didNeedRecovery, userRootWallet }
    })
    // For now, hide modal on error.
    // TODO: add UI for failures later
    yield* put(setVisibility({ modal: 'BuyAudioRecovery', visible: false }))
    yield* put(
      make(Name.BUY_AUDIO_RECOVERY_FAILURE, {
        provider,
        stage,
        error: (e as Error).message
      })
    )
  }
}

function* doStartBuyAudioFlow(action: ReturnType<typeof startBuyAudioFlow>) {
  yield* put(setVisibility({ modal: 'BuyAudio', visible: true }))
  yield* put(startRecoveryIfNecessary())
}

function* watchCalculateAudioPurchaseInfo() {
  yield takeLatest(calculateAudioPurchaseInfo, getAudioPurchaseInfo)
}

function* watchOnRampOpened() {
  yield takeLatest(onrampOpened, doBuyAudio)
}

function* watchStartBuyAudioFlow() {
  yield takeLatest(startBuyAudioFlow, doStartBuyAudioFlow)
}

function* watchRecovery() {
  // Use takeLeading since:
  // 1) We don't want to run more than one recovery flow at a time (so not takeEvery)
  // 2) We don't need to interrupt if already running (so not takeLatest)
  // 3) We do want to be able to trigger more than one time per session in case of same-session failures (so not take)
  yield takeLeading(startRecoveryIfNecessary, recoverPurchaseIfNecessary)
}

/**
 * If the user closed the page or encountered an error in the BuyAudio flow, retry on refresh/next session.
 * Gate on local storage existing for the previous purchase attempt to reduce RPC load.
 */
function* recoverOnPageLoad() {
  yield* put(startRecoveryIfNecessary())
}

export default function sagas() {
  return [
    watchOnRampOpened,
    watchCalculateAudioPurchaseInfo,
    watchStartBuyAudioFlow,
    watchRecovery,
    recoverOnPageLoad
  ]
}
