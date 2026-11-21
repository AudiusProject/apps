import type { PublicKey } from '@solana/web3.js'
import { call, delay } from 'typed-redux-saga'

import { queryAccountUser } from '~/api'
import { IntKeys } from '~/services/remote-config'
import {
  MAX_CONTENT_PRICE_CENTS,
  MAX_USDC_PURCHASE_AMOUNT_CENTS,
  MIN_CONTENT_PRICE_CENTS,
  MIN_USDC_PURCHASE_AMOUNT_CENTS
} from '~/services/remote-config/defaults'

import { getContext } from '../effects'
import { getSDK } from '../sdkUtils'

const POLL_ACCOUNT_INFO_DELAY_MS = 1000
const POLL_ACCOUNT_INFO_RETRIES = 30

export function* getOrCreateUSDCUserBank(ethAddress?: string) {
  const audiusSdk = yield* getContext('audiusSdk')
  const sdk = yield* call(audiusSdk)
  let ethWallet = ethAddress
  if (!ethWallet) {
    const user = yield* call(queryAccountUser)
    if (!user?.wallet) {
      throw new Error('Failed to create USDC user bank: No user wallet found.')
    }
    ethWallet = user.wallet
  }
  const { userBank } = yield* call(
    [
      sdk.services.claimableTokensClient,
      sdk.services.claimableTokensClient.getOrCreateUserBank
    ],
    {
      ethWallet,
      mint: 'USDC'
    }
  )
  return userBank
}

export function* pollForTokenAccountInfo({
  retryDelayMs = POLL_ACCOUNT_INFO_DELAY_MS,
  maxRetryCount = POLL_ACCOUNT_INFO_RETRIES,
  tokenAccount
}: {
  tokenAccount: PublicKey
  retryDelayMs?: number
  maxRetryCount?: number
}) {
  const sdk = yield* getSDK()
  const { getAccount } = yield* call(() => import('@solana/spl-token'))
  const connection = yield* call([
    sdk.services.solanaClient,
    sdk.services.solanaClient.getConnection
  ])

  let retries = 0
  let result
  while (retries < maxRetryCount && !result) {
    result = yield* call(getAccount, connection, tokenAccount)
    retries += 1
    yield* delay(retryDelayMs)
  }
  if (!result) {
    throw new Error(
      `Failed to fetch USDC user bank token account info for ${tokenAccount.toString()}`
    )
  }
  return result
}

export function* getBuyUSDCRemoteConfig() {
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')
  yield* call([remoteConfigInstance, remoteConfigInstance.waitForRemoteConfig])

  const minContentPriceCents =
    remoteConfigInstance.getRemoteVar(IntKeys.MIN_CONTENT_PRICE_CENTS) ??
    MIN_CONTENT_PRICE_CENTS
  const maxContentPriceCents =
    remoteConfigInstance.getRemoteVar(IntKeys.MAX_CONTENT_PRICE_CENTS) ??
    MAX_CONTENT_PRICE_CENTS
  const minUSDCPurchaseAmountCents =
    remoteConfigInstance.getRemoteVar(IntKeys.MIN_USDC_PURCHASE_AMOUNT_CENTS) ??
    MIN_USDC_PURCHASE_AMOUNT_CENTS
  const maxUSDCPurchaseAmountCents =
    remoteConfigInstance.getRemoteVar(IntKeys.MAX_USDC_PURCHASE_AMOUNT_CENTS) ??
    MAX_USDC_PURCHASE_AMOUNT_CENTS

  const retryDelayMs =
    remoteConfigInstance.getRemoteVar(IntKeys.BUY_TOKEN_WALLET_POLL_DELAY_MS) ??
    undefined
  const maxRetryCount =
    remoteConfigInstance.getRemoteVar(
      IntKeys.BUY_TOKEN_WALLET_POLL_MAX_RETRIES
    ) ?? undefined

  return {
    minContentPriceCents,
    maxContentPriceCents,
    minUSDCPurchaseAmountCents,
    maxUSDCPurchaseAmountCents,
    maxRetryCount,
    retryDelayMs
  }
}
