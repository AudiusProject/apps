import type { PurchaseSplit } from '@audius/sdk'

import { Nullable } from '../utils/typeUtils'

import { PurchaseAccess } from './PurchaseContent'
import { StringUSDC } from './Wallet'

export enum USDCTransactionType {
  PURCHASE_STRIPE = 'purchase_stripe',
  PURCHASE_CONTENT = 'purchase_content',
  TRANSFER = 'transfer',
  WITHDRAWAL = 'withdrawal'
}

export enum USDCTransactionMethod {
  SEND = 'send',
  RECEIVE = 'receive'
}

export enum USDCContentPurchaseType {
  TRACK = 'track',
  ALBUM = 'album'
}

export type USDCPurchaseDetails = {
  signature: string
  sellerUserId: number
  buyerUserId: number
  amount: StringUSDC
  extraAmount: StringUSDC
  contentType: USDCContentPurchaseType
  contentId: number
  createdAt: string
  access: PurchaseAccess
  splits: PurchaseSplit[]
}

export type USDCTransactionDetails = {
  signature: string
  transactionType: USDCTransactionType
  method: USDCTransactionMethod
  transactionDate: string
  change: StringUSDC
  balance: StringUSDC
  metadata?: Nullable<object> | string
}
