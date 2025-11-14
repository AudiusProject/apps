import { Action } from '@reduxjs/toolkit'
import type {
  SessionQuote as StripeSessionQuote,
  Currency as StripeCurrency,
  OnrampSessionStatus
} from '@stripe/crypto'

import { DeepNullable, Nullable } from '~/utils/typeUtils'

export type StripeSessionStatus = OnrampSessionStatus

/** Represents properties of the transaction that were specified during
 * session creation and are immutable. All values are optional
 */
export type StripeFixedTransactionDetails = DeepNullable<{
  destination_amount: string
  destination_crypto_amount: string
  destination_currency: string
  destination_network: string
  lock_wallet_address: boolean
  source_amount: string
  source_currency: StripeCurrency
  source_monetary_amount: string
  supported_destination_currencies: string[]
  supported_destination_networks: string[]
  wallet_address: string
  wallet_addresses: string[]
}>

export type StripeTransactionDetails = {
  destination_amount: Nullable<string>
  destination_crypto_amount: string
  destination_network: string
  destination_currency: string
  wallet_address: string
}

export type StripeQuoteDetails = {
  blockchain_tx_id: Nullable<string>
}

export type StripeSessionData = {
  client_secret?: string
  id: string
  quote: Nullable<StripeSessionQuote>
  fixed_transaction_details?: StripeFixedTransactionDetails
  status: StripeSessionStatus
  wallet_address: Nullable<string>
}

export type StripeDestinationCurrencyType = 'sol' | 'usdc'

export type StripeModalState = {
  onrampSucceeded?: Action
  onrampCanceled?: Action
  onrampFailed?: Action
  /** Used as a comparison between updates to detect what changed */
  previousStripeSessionData?: StripeSessionData
  stripeSessionData?: StripeSessionData
  stripeSessionStatus?: StripeSessionStatus
  stripeClientSecret?: string
  portalHostName?: string
}

export type StripeSessionCreationErrorResponseData = {
  error: string
  code: string
  message: string
  type: string
}

export class StripeSessionCreationError extends Error {
  constructor(
    public code: string,
    // Avoiding `message` to not shadow the `message` property on Error
    public stripeErrorMessage: string,
    public type: string
  ) {
    super(`Failed to create Stripe session: ${stripeErrorMessage}`)
  }
}
