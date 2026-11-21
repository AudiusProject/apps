import {
  TransactionDetails,
  TransactionMethod,
  TransactionType
} from '@audius/common/store'

export const isChangePositive = (tx: TransactionDetails) => {
  return (
    tx.transactionType === TransactionType.PURCHASE ||
    tx.method === TransactionMethod.RECEIVE
  )
}
