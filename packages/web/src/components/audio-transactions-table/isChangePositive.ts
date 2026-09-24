import {
  TransactionDetails,
  TransactionMethod,
  TransactionType
} from '@audius/common/store'

/**
 * Whether a transaction increases the user's balance. Separate module so
 * importers don't pull in the table (react-virtualized).
 */
export const isChangePositive = (tx: TransactionDetails) => {
  return (
    tx.transactionType === TransactionType.PURCHASE ||
    tx.method === TransactionMethod.RECEIVE
  )
}
