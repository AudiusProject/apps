import { Keypair, PublicKey } from '@solana/web3.js'
import retry from 'async-retry'
import { takeLatest } from 'redux-saga/effects'
import { call, put, race, select, take, takeLeading } from 'typed-redux-saga'

import { Name } from 'models/Analytics'
import { ErrorLevel } from 'models/ErrorReporting'
import {
  createTransferToUserBankTransaction,
  findAssociatedTokenAddress,
  getRecentBlockhash,
  getRootSolanaAccount,
  getTokenAccountInfo,
  pollForTokenBalanceChange,
  relayTransaction
} from 'services/audius-backend/solana'
import { getAccountUser } from 'store/account/selectors'
import { getContext } from 'store/effects'
import { getFeePayer } from 'store/solana/selectors'
import { setVisibility } from 'store/ui/modals/parentSlice'
import { initializeStripeModal } from 'store/ui/stripe-modal/slice'
import { waitForValue } from 'utils'

import {
  buyUSDCFlowFailed,
  buyUSDCFlowSucceeded,
  onrampCanceled,
  onrampFailed,
  onrampOpened,
  purchaseStarted,
  onrampSucceeded,
  startRecoveryIfNecessary,
  recoveryStatusChanged
} from './slice'
import { BuyUSDCError, BuyUSDCErrorCode, USDCOnRampProvider } from './types'
import { getBuyUSDCRemoteConfig, getUSDCUserBank } from './utils'

type PurchaseStepParams = {
  desiredAmount: number
  wallet: PublicKey
  provider: USDCOnRampProvider
  retryDelayMs?: number
  maxRetryCount?: number
}

function* purchaseStep({
  desiredAmount,
  wallet,
  provider,
  retryDelayMs,
  maxRetryCount
}: PurchaseStepParams) {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const { track, make } = yield* getContext('analytics')

  const tokenAccount = yield* call(
    findAssociatedTokenAddress,
    audiusBackendInstance,
    { solanaAddress: wallet.toString(), mint: 'usdc' }
  )

  const initialAccountInfo = yield* call(
    getTokenAccountInfo,
    audiusBackendInstance,
    {
      mint: 'usdc',
      tokenAccount
    }
  )
  const initialBalance = initialAccountInfo?.amount ?? BigInt(0)

  yield* put(purchaseStarted())

  // Wait for on ramp finish
  const result = yield* race({
    failure: take(onrampFailed),
    success: take(onrampSucceeded),
    canceled: take(onrampCanceled)
  })

  // If the user didn't complete the on ramp flow, return early
  if (result.canceled) {
    yield* call(
      track,
      make({ eventName: Name.BUY_USDC_ON_RAMP_CANCELED, provider })
    )
    return {}
  } else if (result.failure) {
    const errorString = result.failure.payload?.error
      ? result.failure.payload.error.message
      : 'Unknown error'

    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_ON_RAMP_FAILURE,
        provider,
        error: errorString
      })
    )
    if (
      result.failure.payload?.error?.code ===
      'crypto_onramp_unsupported_country'
    ) {
      throw new BuyUSDCError(BuyUSDCErrorCode.CountryNotSupported, errorString)
    }
    // Throw up to the flow above this
    throw new BuyUSDCError(BuyUSDCErrorCode.OnrampError, errorString)
  }
  yield* call(
    track,
    make({ eventName: Name.BUY_USDC_ON_RAMP_SUCCESS, provider })
  )

  // Wait for the funds to come through
  const newBalance = yield* call(
    pollForTokenBalanceChange,
    audiusBackendInstance,
    {
      mint: 'usdc',
      tokenAccount,
      initialBalance,
      retryDelayMs,
      maxRetryCount
    }
  )

  // Check that we got the requested amount
  const purchasedAmount = newBalance - initialBalance
  if (purchasedAmount !== BigInt(desiredAmount)) {
    console.warn(
      `Warning: Purchase USDC amount differs from expected. Actual: ${
        newBalance - initialBalance
      } Wei. Expected: ${desiredAmount / 100} USDC.`
    )
  }

  return { newBalance }
}

function* transferStep({
  wallet,
  userBank,
  amount,
  maxRetryCount = 3,
  retryDelayMs = 1000
}: {
  wallet: Keypair
  userBank: PublicKey
  amount: bigint
  maxRetryCount?: number
  retryDelayMs?: number
}) {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const feePayer = yield* select(getFeePayer)
  if (!feePayer) {
    throw new Error('Missing feePayer unexpectedly')
  }
  const feePayerOverride = new PublicKey(feePayer)
  const recentBlockhash = yield* call(getRecentBlockhash, audiusBackendInstance)

  yield* call(
    retry,
    async () => {
      const transferTransaction = await createTransferToUserBankTransaction(
        audiusBackendInstance,
        {
          wallet,
          userBank,
          mint: 'usdc',
          amount,
          memo: 'In-App $USDC Purchase: Link by Stripe',
          feePayer: feePayerOverride,
          recentBlockhash
        }
      )
      transferTransaction.partialSign(wallet)

      console.debug(`Starting transfer transaction...`)
      const { res, error } = await relayTransaction(audiusBackendInstance, {
        transaction: transferTransaction
      })

      if (res) {
        console.debug(`Transfer transaction succeeded: ${res}`)
        return
      }

      console.debug(
        `Transfer transaction stringified: ${JSON.stringify(
          transferTransaction
        )}`
      )
      // Throw to retry
      throw new Error(error ?? 'Unknown USDC user bank transfer error')
    },
    {
      minTimeout: retryDelayMs,
      retries: maxRetryCount,
      factor: 1,
      onRetry: (e: Error, attempt: number) => {
        console.error(
          `Got error transferring USDC to user bank: ${e}. Attempt ${attempt}. Retrying...`
        )
      }
    }
  )
}

function* doBuyUSDC({
  payload: {
    provider,
    purchaseInfo: { desiredAmount }
  }
}: ReturnType<typeof onrampOpened>) {
  const reportToSentry = yield* getContext('reportToSentry')
  const { track, make } = yield* getContext('analytics')
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const config = yield* call(getBuyUSDCRemoteConfig)

  const userBank = yield* getUSDCUserBank()
  const rootAccount = yield* call(getRootSolanaAccount, audiusBackendInstance)

  try {
    if (provider !== USDCOnRampProvider.STRIPE) {
      throw new BuyUSDCError(
        BuyUSDCErrorCode.OnrampError,
        'USDC Purchase is only supported via Stripe'
      )
    }

    if (desiredAmount < config.minUSDCPurchaseAmountCents) {
      throw new BuyUSDCError(
        BuyUSDCErrorCode.MinAmountNotMet,
        `Minimum USDC purchase amount is ${config.minUSDCPurchaseAmountCents} cents`
      )
    }

    if (desiredAmount > config.maxUSDCPurchaseAmountCents) {
      throw new BuyUSDCError(
        BuyUSDCErrorCode.MaxAmountExceeded,
        `Maximum USDC purchase amount is ${config.maxUSDCPurchaseAmountCents} cents`
      )
    }

    yield* put(
      initializeStripeModal({
        // stripe expects amount in dollars, not cents
        amount: (desiredAmount / 100).toString(),
        destinationCurrency: 'usdc',
        destinationWallet: rootAccount.publicKey.toString(),
        onrampCanceled,
        onrampFailed,
        onrampSucceeded
      })
    )

    yield* put(setVisibility({ modal: 'StripeOnRamp', visible: true }))

    // Record start
    yield* call(
      track,
      make({ eventName: Name.BUY_USDC_ON_RAMP_OPENED, provider })
    )

    // Get config
    const { retryDelayMs, maxRetryCount } = yield* call(getBuyUSDCRemoteConfig)

    // Wait for purchase
    // Have to do some typescript finangling here due to the "race" effect in purchaseStep
    // See https://github.com/agiledigital/typed-redux-saga/issues/43
    const { newBalance } = (yield* call(purchaseStep, {
      provider,
      desiredAmount,
      wallet: rootAccount.publicKey,
      retryDelayMs,
      maxRetryCount
    }) as unknown as ReturnType<typeof purchaseStep>)!

    // If the user canceled the purchase, stop the flow
    if (newBalance === undefined) {
      return
    }

    // Transfer from the root wallet to the userbank
    yield* call(transferStep, {
      wallet: rootAccount,
      userBank,
      amount: newBalance
    })

    yield* put(buyUSDCFlowSucceeded())

    // Record success
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_SUCCESS,
        provider,
        requestedAmount: desiredAmount
      })
    )
  } catch (e) {
    const error =
      e instanceof BuyUSDCError
        ? e
        : new BuyUSDCError(BuyUSDCErrorCode.OnrampError, `${e}`)
    yield* call(reportToSentry, {
      level: ErrorLevel.Error,
      error,
      additionalInfo: { userBank }
    })
    yield* put(buyUSDCFlowFailed({ error }))
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_FAILURE,
        provider,
        requestedAmount: desiredAmount,
        error: error.message
      })
    )
  }
}

function* recoverPurchaseIfNecessary() {
  const user = yield* select(getAccountUser)
  if (!user) return

  const reportToSentry = yield* getContext('reportToSentry')
  const { track, make } = yield* getContext('analytics')
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')

  try {
    yield* call(waitForValue, getFeePayer)
    const userBank = yield* getUSDCUserBank()
    const rootAccount = yield* call(getRootSolanaAccount, audiusBackendInstance)

    const usdcTokenAccount = yield* call(
      findAssociatedTokenAddress,
      audiusBackendInstance,
      { solanaAddress: rootAccount.publicKey.toString(), mint: 'usdc' }
    )
    const accountInfo = yield* call(
      getTokenAccountInfo,
      audiusBackendInstance,
      {
        mint: 'usdc',
        tokenAccount: usdcTokenAccount
      }
    )
    const amount = accountInfo?.amount ?? BigInt(0)
    if (amount === BigInt(0)) {
      return
    }

    const userBankAddress = userBank.toBase58()

    // Transfer all USDC from the from the root wallet to the user bank
    yield* put(recoveryStatusChanged({ status: 'in-progress' }))
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_RECOVERY_IN_PROGRESS,
        userBank: userBankAddress
      })
    )
    yield* call(transferStep, {
      wallet: rootAccount,
      userBank,
      amount
    })

    yield* put(recoveryStatusChanged({ status: 'success' }))
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_RECOVERY_SUCCESS,
        userBank: userBankAddress
      })
    )
  } catch (e) {
    yield* put(recoveryStatusChanged({ status: 'failure' }))
    yield* call(reportToSentry, {
      level: ErrorLevel.Error,
      error: e as Error
    })
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_RECOVERY_FAILURE,
        error: (e as Error).message
      })
    )
  }
}

function* watchOnRampOpened() {
  yield takeLatest(onrampOpened, doBuyUSDC)
}

function* watchRecovery() {
  // Use takeLeading since:
  // 1) We don't want to run more than one recovery flow at a time (so not takeEvery)
  // 2) We don't need to interrupt if already running (so not takeLatest)
  // 3) We do want to be able to trigger more than one time per session in case of same-session failures (so not take)
  yield* takeLeading(startRecoveryIfNecessary, recoverPurchaseIfNecessary)
}

/**
 * If the user closed the page or encountered an error in the BuyAudio flow, retry on refresh/next session.
 * Gate on local storage existing for the previous purchase attempt to reduce RPC load.
 */
function* recoverOnPageLoad() {
  yield* call(recoverPurchaseIfNecessary)
}

export default function sagas() {
  return [watchOnRampOpened, watchRecovery, recoverOnPageLoad]
}
