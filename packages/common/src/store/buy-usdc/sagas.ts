import { USDC } from '@audius/fixed-decimal'
import {
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TokenAccountNotFoundError
} from '@solana/spl-token'
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'
import retry from 'async-retry'
import { takeLatest } from 'redux-saga/effects'
import { call, put, race, take, takeLeading } from 'typed-redux-saga'

import { queryHasAccount, queryAccountUser, queryWalletAddresses } from '~/api'
import { Name } from '~/models/Analytics'
import { PurchaseVendor } from '~/models/PurchaseContent'
import { Status } from '~/models/Status'
import { StringUSDC } from '~/models/Wallet'
import {
  findAssociatedTokenAddress,
  getUserbankAccountInfo,
  MEMO_PROGRAM_ID,
  pollForTokenBalanceChange,
  recoverUsdcFromRootWallet
} from '~/services/audius-backend/solana'
import { getContext } from '~/store/effects'
import { setVisibility } from '~/store/ui/modals/parentSlice'
import { initializeStripeModal } from '~/store/ui/stripe-modal/slice'
import { setUSDCBalance } from '~/store/wallet/slice'
import { waitForRead } from '~/utils'

import { getSDK } from '../sdkUtils'

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
import { BuyUSDCError, BuyUSDCErrorCode } from './types'
import {
  getBuyUSDCRemoteConfig,
  getOrCreateUSDCUserBank,
  pollForTokenAccountInfo
} from './utils'

type PurchaseStepParams = {
  desiredAmount: number
  wallet: PublicKey
  vendor: PurchaseVendor
  retryDelayMs?: number
  maxRetryCount?: number
}

const TRANSACTION_RETRY_COUNT = 3
const TRANSACTION_RETRY_DELAY_MS = 1000

function* purchaseStep({
  desiredAmount,
  wallet,
  vendor,
  retryDelayMs,
  maxRetryCount
}: PurchaseStepParams) {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  const { track, make } = yield* getContext('analytics')

  const tokenAccount = yield* call(
    findAssociatedTokenAddress,
    audiusBackendInstance,
    { solanaAddress: wallet.toString(), mint: 'USDC' }
  )

  const connection = yield* call([
    sdk.services.solanaClient,
    sdk.services.solanaClient.getConnection
  ])
  const initialAccountInfo = yield* call(getAccount, connection, tokenAccount)
  const initialBalance = initialAccountInfo?.amount ?? BigInt(0)

  yield* put(purchaseStarted())

  const result = yield* race({
    failure: take(onrampFailed),
    success: take(onrampSucceeded),
    canceled: take(onrampCanceled)
  })

  if (result.canceled) {
    yield* call(
      track,
      make({ eventName: Name.BUY_USDC_ON_RAMP_CANCELED, vendor })
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
        vendor,
        error: errorString
      })
    )
    if (
      result.failure.payload?.error?.code ===
      'crypto_onramp_unsupported_country'
    ) {
      throw new BuyUSDCError(BuyUSDCErrorCode.CountryNotSupported, errorString)
    }
    throw new BuyUSDCError(BuyUSDCErrorCode.OnrampError, errorString)
  }
  yield* call(track, make({ eventName: Name.BUY_USDC_ON_RAMP_SUCCESS, vendor }))

  const newBalance = yield* call(pollForTokenBalanceChange, sdk, {
    mint: 'USDC',
    tokenAccount,
    initialBalance,
    retryDelayMs,
    maxRetryCount
  })

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
  maxRetryCount = TRANSACTION_RETRY_COUNT,
  retryDelayMs = TRANSACTION_RETRY_DELAY_MS
}: {
  wallet: Keypair
  userBank: PublicKey
  amount: bigint
  maxRetryCount?: number
  retryDelayMs?: number
}) {
  const sdk = yield* getSDK()
  const { USDC_MINT_ADDRESS } = yield* getContext('env')
  const mintPublicKey = new PublicKey(USDC_MINT_ADDRESS)
  const mintDecimals = USDC(0).decimalPlaces
  const memoInstruction = new TransactionInstruction({
    keys: [
      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: true
      }
    ],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from('In-App $USDC Purchase: Link by Stripe')
  })
  const transferInstruction = createTransferCheckedInstruction(
    getAssociatedTokenAddressSync(mintPublicKey, wallet.publicKey), // source
    mintPublicKey, // mint
    userBank, // destination
    wallet.publicKey, // owner
    amount, // amount
    mintDecimals
  )

  yield* call(
    retry,
    async () => {
      console.debug(`Starting transfer transaction...`)
      const transferTransaction =
        await sdk.services.solanaClient.buildTransaction({
          instructions: [memoInstruction, transferInstruction]
        })
      transferTransaction.sign([wallet])
      const res =
        await sdk.services.solanaClient.sendTransaction(transferTransaction)

      console.debug(`Transfer transaction succeeded: ${res}`)
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
    vendor,
    purchaseInfo: { desiredAmount },
    portalHostName
  }
}: ReturnType<typeof onrampOpened>) {
  const { track, make } = yield* getContext('analytics')
  const solanaWalletService = yield* getContext('solanaWalletService')
  const config = yield* call(getBuyUSDCRemoteConfig)
  const sdk = yield* getSDK()

  const userBank = yield* getOrCreateUSDCUserBank()

  try {
    const rootAccount = yield* call([
      solanaWalletService,
      solanaWalletService.getKeypair
    ])
    if (!rootAccount) {
      throw new BuyUSDCError(
        BuyUSDCErrorCode.OnrampError,
        'Missing solana root wallet'
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
    switch (vendor) {
      case PurchaseVendor.STRIPE: {
        yield* put(
          initializeStripeModal({
            amount: (desiredAmount / 100).toString(),
            destinationCurrency: 'usdc',
            destinationWallet: rootAccount.publicKey.toString(),
            onrampCanceled: onrampCanceled(),
            onrampFailed: onrampFailed({}),
            onrampSucceeded: onrampSucceeded(),
            portalHostName
          })
        )

        yield* put(setVisibility({ modal: 'StripeOnRamp', visible: true }))

        yield* call(
          track,
          make({ eventName: Name.BUY_USDC_ON_RAMP_OPENED, vendor })
        )

        const { retryDelayMs, maxRetryCount } = yield* call(
          getBuyUSDCRemoteConfig
        )

        const { newBalance } = (yield* call(purchaseStep, {
          vendor,
          desiredAmount,
          wallet: rootAccount.publicKey,
          retryDelayMs,
          maxRetryCount
        }) as unknown as ReturnType<typeof purchaseStep>)!

        if (newBalance === undefined) {
          return
        }

        yield* call(transferStep, {
          wallet: rootAccount,
          userBank,
          amount: newBalance
        })
        break
      }
      default:
        throw new BuyUSDCError(
          BuyUSDCErrorCode.OnrampError,
          'Unsupported vendor'
        )
    }

    yield* put(buyUSDCFlowSucceeded())

    const { currentUser: ethAddress } = yield* call(queryWalletAddresses)
    if (!ethAddress) {
      throw new Error('User is not signed in')
    }
    const account = yield* call(getUserbankAccountInfo, sdk, {
      ethAddress,
      mint: 'USDC'
    })
    const balance = account?.amount ?? BigInt(0)
    yield* put(setUSDCBalance({ amount: balance.toString() as StringUSDC }))

    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_SUCCESS,
        vendor,
        requestedAmount: desiredAmount
      })
    )
  } catch (e) {
    const error =
      e instanceof BuyUSDCError
        ? e
        : new BuyUSDCError(BuyUSDCErrorCode.OnrampError, `${e}`)
    console.error('BuyUSDC onramp failed', error, { userBank })
    yield* put(buyUSDCFlowFailed({ error }))
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_FAILURE,
        vendor,
        requestedAmount: desiredAmount,
        error: error.message
      })
    )
  }
}

function* recoverPurchaseIfNecessary() {
  yield* waitForRead()
  const hasAccount = yield* call(queryHasAccount)
  if (!hasAccount) return

  const { track, make } = yield* getContext('analytics')
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const solanaWalletService = yield* getContext('solanaWalletService')
  const sdk = yield* getSDK()

  try {
    const rootAccount = yield* call([
      solanaWalletService,
      solanaWalletService.getKeypair
    ])
    if (!rootAccount) {
      throw new Error('Missing solana root wallet')
    }

    const usdcTokenAccount = yield* call(
      findAssociatedTokenAddress,
      audiusBackendInstance,
      {
        solanaAddress: rootAccount.publicKey.toString(),
        mint: 'USDC'
      }
    )

    const connection = yield* call([
      sdk.services.solanaClient,
      sdk.services.solanaClient.getConnection
    ])
    let amount: bigint
    try {
      const accountInfo = yield* call(getAccount, connection, usdcTokenAccount)
      amount = accountInfo.amount
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError) {
        amount = BigInt(0)
      } else {
        throw e
      }
    }

    if (amount === BigInt(0)) {
      return
    }

    const userBank = yield* getOrCreateUSDCUserBank()
    const userBankAccountInfo = yield* call(pollForTokenAccountInfo, {
      tokenAccount: userBank
    })

    const userBankInitialBalance = userBankAccountInfo?.amount ?? BigInt(0)

    const userBankAddress = userBank.toBase58()

    yield* put(recoveryStatusChanged({ status: Status.LOADING }))
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_RECOVERY_IN_PROGRESS,
        userBank: userBankAddress
      })
    )

    const user = yield* call(queryAccountUser)
    const ethWallet = user?.wallet
    if (!ethWallet) {
      throw new Error('User is not signed in')
    }

    console.debug('Recovering', amount, 'USDC from root wallet...')
    const signature = yield* call(recoverUsdcFromRootWallet, {
      sdk,
      sender: rootAccount,
      receiverEthWallet: ethWallet,
      amount
    })

    yield* call(
      [connection, connection.confirmTransaction],
      signature,
      'finalized'
    )

    const updatedBalance = yield* call(pollForTokenBalanceChange, sdk, {
      tokenAccount: userBank,
      mint: 'USDC',
      initialBalance: userBankInitialBalance
    })

    yield* put(
      setUSDCBalance({ amount: updatedBalance.toString() as StringUSDC })
    )

    yield* put(recoveryStatusChanged({ status: Status.SUCCESS }))
    yield* call(
      track,
      make({
        eventName: Name.BUY_USDC_RECOVERY_SUCCESS,
        userBank: userBankAddress
      })
    )
  } catch (e) {
    yield* put(recoveryStatusChanged({ status: Status.ERROR }))
    console.error('BuyUSDC recovery failed', e)
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
  yield* takeLeading(startRecoveryIfNecessary, recoverPurchaseIfNecessary)
}

export default function sagas() {
  return [watchOnRampOpened, watchRecovery]
}
