import type { TransactionDetails as SdkTransactionDetails } from '@audius/sdk/services'

import {
  TransactionDetails,
  TransactionMethod,
  TransactionType
} from '~/store/ui/transaction-details/types'

export const audioTransactionFromSdk = (
  tx: SdkTransactionDetails
): TransactionDetails => {
  const transactionTypeMap: Record<string, TransactionType> = {
    purchase_stripe: TransactionType.PURCHASE,
    purchase_coinbase: TransactionType.PURCHASE,
    purchase_unknown: TransactionType.PURCHASE,
    'purchase unknown': TransactionType.PURCHASE,
    user_reward: TransactionType.CHALLENGE_REWARD,
    trending_reward: TransactionType.TRENDING_REWARD,
    transfer: TransactionType.TRANSFER
  }

  const txType = transactionTypeMap[tx.transactionType]
  switch (txType) {
    case TransactionType.CHALLENGE_REWARD:
    case TransactionType.TRENDING_REWARD:
      return {
        signature: tx.signature,
        transactionType: txType,
        method: TransactionMethod.RECEIVE,
        date: tx.transactionDate,
        change: tx.change,
        balance: tx.balance,
        metadata: tx.metadata as unknown as string
      }
    case TransactionType.PURCHASE:
      return {
        signature: tx.signature,
        transactionType: txType,
        method:
          tx.method === 'purchase_stripe'
            ? TransactionMethod.STRIPE
            : tx.method === 'purchase_coinbase'
              ? TransactionMethod.COINBASE
              : TransactionMethod.RECEIVE,
        date: tx.transactionDate,
        change: tx.change,
        balance: tx.balance,
        metadata: undefined
      }
    case TransactionType.TRANSFER:
      return {
        signature: tx.signature,
        transactionType: txType,
        method:
          tx.method === 'send'
            ? TransactionMethod.SEND
            : TransactionMethod.RECEIVE,
        date: tx.transactionDate,
        change: tx.change,
        balance: tx.balance,
        metadata: tx.metadata as unknown as string
      }
    default:
      throw new Error('Unknown Transaction')
  }
}
